import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import ScreenHeader from "../ScreenHeader";
import { fetchTokenPriceUsd } from "@/lib/api/portfolioUtils";
import { Token as ApiToken, NativeType } from "@/types/tokens";
import {
  SolanaIcon,
  EthereumIcon,
  PolygonIcon,
  BaseIcon,
  ArbitrumIcon,
  TokenPlaceholderIcon,
} from "@/icons";
import supportedTokensData from "@/lib/tx/mayan-bridge/constants/supportedToekns.json";
import fetchTokens from "@/lib/api/tokens";
import { formatTokenAmount } from "@/lib/api/portfolioUtils";

interface Token {
  name: string;
  symbol: string;
  mint: string;
  contract: string;
  chainId: number;
  wChainId: number;
  decimals: number;
  logoURI: string;
  chain: string;
  balance?: string;
  value?: string;
}

export default function SwapScreen() {
  const { colors, theme } = useTheme();

  // State
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [estimatedAmount, setEstimatedAmount] = useState<string>("");
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [isFromTokenSelection, setIsFromTokenSelection] =
    useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);
  const [activeChain, setActiveChain] = useState<string>("");
  const [tokenPrices, setTokenPrices] = useState<{
    fromPrice: number;
    toPrice: number;
  }>({ fromPrice: 0, toPrice: 0 });

  // Initialize with default tokens
  useEffect(() => {
    const loadTokensWithBalances = async () => {
      setIsLoading(true);
      try {
        // 1. Load all supported tokens
        const supportedTokens: Token[] = [];
        const supportedTokensDataAny = supportedTokensData as Record<
          string,
          any[]
        >;
        Object.keys(supportedTokensDataAny).forEach((chain) => {
          supportedTokensDataAny[chain].forEach((token) => {
            supportedTokens.push({
              ...token,
              chain,
              balance: "0.00", // default, will be overwritten if user has balance
              value: "",
            });
          });
        });

        // 2. Fetch user tokens and balances
        const { tokens: userTokens } = await fetchTokens();
        // Create a map for quick lookup: key = chain + symbol (or contract/mint)
        const userTokenMap = new Map();
        userTokens.forEach((token: any) => {
          const key =
            token.data.chain.name.toLowerCase() +
            "-" +
            (token.data.contractAddress ||
              token.data.mintAddress ||
              token.data.symbol);
          userTokenMap.set(key, {
            amount: token.data.amount,
            decimals: token.data.decimals,
          });
        });

        // 3. Merge balances into supported tokens
        let mergedTokens = supportedTokens.map((token) => {
          const key =
            token.chain + "-" + (token.contract || token.mint || token.symbol);
          const userToken = userTokenMap.get(key);
          return {
            ...token,
            balance: userToken
              ? formatTokenAmount(userToken.amount, userToken.decimals)
              : "0.00",
          };
        });

        // Sort so tokens with balance > 0 are on top
        mergedTokens.sort((a, b) => {
          const aBal = parseFloat(a.balance);
          const bBal = parseFloat(b.balance);
          if (aBal > 0 && bBal === 0) return -1;
          if (aBal === 0 && bBal > 0) return 1;
          return 0;
        });

        // 4. Fetch USD prices for all tokens and update value field
        const mergedTokensWithPrices = await Promise.all(
          mergedTokens.map(async (token) => {
            try {
              // Convert to API token format for price fetch
              const apiToken = convertToApiToken(token);
              const { price } = await fetchTokenPriceUsd(apiToken);
              let usdValue = 0;
              if (price > 0 && token.balance && !isNaN(Number(token.balance))) {
                usdValue = parseFloat(token.balance) * price;
              }
              return {
                ...token,
                value: price > 0 ? `$${usdValue.toFixed(2)}` : "$0.00",
              };
            } catch {
              return {
                ...token,
                value: "$0.00",
              };
            }
          }),
        );

        setAllTokens(mergedTokensWithPrices);
        // Set default from and to tokens (SOL -> USDC)
        if (mergedTokensWithPrices.length > 0) {
          const sol = mergedTokensWithPrices.find(
            (t) => t.symbol === "SOL" && t.chain === "solana",
          );
          const usdc = mergedTokensWithPrices.find((t) => t.symbol === "USDC");
          if (sol) setFromToken(sol);
          if (usdc) setToToken(usdc);
        }
      } catch (e) {
        // handle error
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTokensWithBalances();
  }, [activeChain]);

  // Update button disabled state
  useEffect(() => {
    setButtonDisabled(!fromToken || !toToken || !amount || amount === "0");
  }, [fromToken, toToken, amount]);

  // Filter tokens when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredTokens(
        allTokens.filter((token) => token.chain === activeChain),
      );
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query),
    );

    setFilteredTokens(filtered);
  }, [searchQuery, allTokens, activeChain]);

  // Helper function to convert token to API token format
  const convertToApiToken = (token: Token) => {
    // Get chain ID in the format expected by the API
    const getChainId = (chain: string): string => {
      switch (chain) {
        case "solana":
          return "solana:101";
        case "ethereum":
          return "eip155:1";
        case "polygon":
          return "eip155:137";
        case "base":
          return "eip155:8453";
        case "arbitrum":
          return "eip155:42161";
        default:
          return "";
      }
    };

    // Determine token type
    let tokenType: string;
    if (token.chain === "solana") {
      tokenType = "SPL";
    } else {
      tokenType = "ERC20";
    }

    // Special case for native tokens
    if (
      (token.chain === "solana" && token.symbol === "SOL") ||
      (token.chain === "ethereum" && token.symbol === "ETH") ||
      (token.chain === "polygon" && token.symbol === "MATIC") ||
      (token.chain === "base" && token.symbol === "ETH") ||
      (token.chain === "arbitrum" && token.symbol === "ETH")
    ) {
      let nativeType: NativeType;
      switch (token.chain) {
        case "solana":
          nativeType = "SolanaNative";
          break;
        case "ethereum":
          nativeType = "EthereumNative";
          break;
        case "polygon":
          nativeType = "PolygonNative";
          break;
        case "base":
          nativeType = "BaseNative";
          break;
        case "arbitrum":
          nativeType = "ArbitrumNative";
          break;
        default:
          nativeType = "SolanaNative";
      }

      return {
        type: nativeType,
        data: {
          chain: {
            id: getChainId(token.chain),
            name: token.chain,
            symbol: token.symbol,
            imageUrl: "",
          },
          walletAddress: "",
          decimals: token.decimals || 9,
          amount: "0",
          logoUri: token.logoURI || "",
          name: token.name,
          symbol: token.symbol,
          coingeckoId: null,
          spamStatus: "VERIFIED",
        },
      } as ApiToken;
    }

    // For ERC20 tokens
    if (tokenType === "ERC20") {
      return {
        type: "ERC20",
        data: {
          chain: {
            id: getChainId(token.chain),
            name: token.chain,
            symbol: token.symbol,
            imageUrl: "",
          },
          walletAddress: "",
          contractAddress: token.contract || "",
          decimals: token.decimals || 18,
          amount: "0",
          logoUri: token.logoURI || "",
          name: token.name,
          symbol: token.symbol,
          coingeckoId: null,
          spamStatus: "VERIFIED",
        },
      } as ApiToken;
    }

    // For SPL tokens
    return {
      type: "SPL",
      data: {
        chain: {
          id: getChainId(token.chain),
          name: token.chain,
          symbol: token.symbol,
          imageUrl: "",
        },
        walletAddress: "",
        mintAddress: token.mint || "",
        splTokenAccountPubkey: "",
        programId: "",
        decimals: token.decimals || 9,
        amount: "0",
        logoUri: token.logoURI || "",
        name: token.name,
        symbol: token.symbol,
        coingeckoId: null,
        spamStatus: "VERIFIED",
      },
    } as ApiToken;
  };

  // Calculate estimated amount when amount or tokens change
  useEffect(() => {
    if (fromToken && toToken && amount && amount !== "0") {
      setIsLoading(true);

      // Use real price data from fetchTokenPriceUsd
      const fetchPrices = async () => {
        try {
          // Convert tokens to API format
          const fromTokenApi = convertToApiToken(fromToken);
          const toTokenApi = convertToApiToken(toToken);

          // Fetch prices using the API tokens
          const [fromTokenPrice, toTokenPrice] = await Promise.all([
            fetchTokenPriceUsd(fromTokenApi),
            fetchTokenPriceUsd(toTokenApi),
          ]);

          // Calculate the exchange rate based on actual prices
          let exchangeRate = 1;
          if (fromTokenPrice.price > 0 && toTokenPrice.price > 0) {
            exchangeRate = fromTokenPrice.price / toTokenPrice.price;
          }

          // Store token prices in state for use in UI
          setTokenPrices({
            fromPrice: fromTokenPrice.price,
            toPrice: toTokenPrice.price,
          });

          const estimated = (parseFloat(amount) * exchangeRate).toFixed(6);
          setEstimatedAmount(estimated);
        } catch (error) {
          console.error("Error fetching token prices:", error);
          // Fallback to a simple calculation if price fetching fails
          const fallbackRate =
            fromToken.symbol === "SOL" && toToken.symbol === "USDC"
              ? 175.3
              : 0.0057;
          const estimated = (parseFloat(amount) * fallbackRate).toFixed(6);
          setEstimatedAmount(estimated);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPrices();
    } else {
      setEstimatedAmount("");
    }
  }, [fromToken, toToken, amount]);

  // Handle opening token selection modal
  const openTokenModal = (isFrom: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFromTokenSelection(isFrom);
    setModalVisible(true);
    setSearchQuery("");
    setFilteredTokens(allTokens);

    // Set active chain based on current token selection
    if (isFrom && fromToken) {
      setActiveChain(fromToken.chain);
    } else if (!isFrom && toToken) {
      setActiveChain(toToken.chain);
    } else {
      setActiveChain("solana");
    }
  };

  // Handle token selection
  const selectToken = (token: Token) => {
    Haptics.selectionAsync();

    // Reset token prices when changing tokens
    setTokenPrices({ fromPrice: 0, toPrice: 0 });

    if (isFromTokenSelection) {
      setFromToken(token);
      // Avoid selecting the same token
      if (
        toToken &&
        token.symbol === toToken.symbol &&
        token.chain === toToken.chain
      ) {
        setToToken(null);
      }
    } else {
      setToToken(token);
      // Avoid selecting the same token
      if (
        fromToken &&
        token.symbol === fromToken.symbol &&
        token.chain === fromToken.chain
      ) {
        setFromToken(null);
      }
    }

    setModalVisible(false);
  };

  // Handle swap direction
  const swapTokens = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (fromToken && toToken) {
      const temp = fromToken;
      setFromToken(toToken);
      setToToken(temp);

      // Reset prices and estimated amount when swapping
      setTokenPrices({
        fromPrice: tokenPrices.toPrice,
        toPrice: tokenPrices.fromPrice,
      });
    }
  };

  // Handle swap button press
  const handleSwap = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Implement swap logic
    alert("Swap functionality to be implemented");
  };

  // Filter tokens by chain
  const filterByChain = (chain: string) => {
    Haptics.selectionAsync();
    setActiveChain(chain);

    // Filter tokens by selected chain
    const chainTokens = allTokens.filter((token) => token.chain === chain);
    setFilteredTokens(chainTokens);
  };

  // Get chain icon
  const getChainIcon = (chain: string, size: number = 24) => {
    switch (chain) {
      case "solana":
        return <SolanaIcon width={size} height={size} />;
      case "ethereum":
        return <EthereumIcon width={size} height={size} />;
      case "polygon":
        return <PolygonIcon width={size} height={size} />;
      case "base":
        return <BaseIcon width={size} height={size} />;
      case "arbitrum":
        return <ArbitrumIcon width={size} height={size} />;
      default:
        return <TokenPlaceholderIcon width={size} height={size} symbol="?" />;
    }
  };

  // Render token item for selection list
  const renderTokenItem = ({ item }: { item: Token }) => (
    <TouchableOpacity
      style={[
        styles.tokenItem,
        { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
      ]}
      onPress={() => selectToken(item)}>
      <View style={styles.tokenIconContainer}>
        {item.logoURI ? (
          <Image
            source={{ uri: item.logoURI }}
            style={styles.tokenIcon}
            onError={() => {}}
          />
        ) : (
          <TokenPlaceholderIcon
            width={40}
            height={40}
            symbol={item.symbol[0]}
          />
        )}
      </View>

      <View style={styles.tokenInfo}>
        <Text style={[styles.tokenName, { color: colors.text }]}>
          {item.name}
        </Text>
        <View style={styles.tokenChainContainer}>
          <Text style={[styles.tokenSymbol, { color: colors.secondaryText }]}>
            {item.symbol}
          </Text>
          <View style={styles.chainBadge}>
            {getChainIcon(item.chain, 16)}
            <Text style={[styles.chainText, { color: colors.secondaryText }]}>
              {item.chain.charAt(0).toUpperCase() + item.chain.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tokenBalance}>
        <Text style={[styles.tokenBalanceText, { color: colors.text }]}>
          {item.balance || "0.00"}
        </Text>
        <Text style={[styles.tokenValueText, { color: colors.secondaryText }]}>
          {item.value || "$0.00"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Update the selected token display in the swap screen
  const renderSelectedToken = (token: Token | null, isFrom: boolean) => (
    <TouchableOpacity
      style={styles.tokenSelector}
      onPress={() => openTokenModal(isFrom)}>
      {token ? (
        <View style={styles.selectedToken}>
          {token.logoURI ? (
            <Image
              source={{ uri: token.logoURI }}
              style={styles.selectedTokenIcon}
              onError={() => {}}
            />
          ) : (
            <TokenPlaceholderIcon
              width={24}
              height={24}
              symbol={token.symbol[0]}
            />
          )}
          <View style={styles.selectedTokenInfo}>
            <Text style={[styles.selectedTokenText, { color: colors.text }]}>
              {token.symbol}
            </Text>
            <View style={styles.selectedTokenChain}>
              {getChainIcon(token.chain, 12)}
              <Text
                style={[
                  styles.selectedTokenChainText,
                  { color: colors.secondaryText },
                ]}>
                {token.chain.charAt(0).toUpperCase() + token.chain.slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.secondaryText}
          />
        </View>
      ) : (
        <View style={styles.selectedToken}>
          <Text style={[styles.selectTokenText, { color: colors.primary }]}>
            Select Token
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  // Render chain tabs
  const renderChainTabs = () => {
    const chains = ["solana", "ethereum", "polygon", "base", "arbitrum"];

    return (
      <View style={styles.chainTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chainTabsContainer}>
          {chains.map((chain) => (
            <TouchableOpacity
              key={chain}
              style={[
                styles.chainTab,
                activeChain === chain && styles.chainTabActive,
                {
                  borderColor:
                    activeChain === chain ? colors.primary : colors.border,
                  backgroundColor:
                    activeChain === chain ? colors.primaryLight : "transparent",
                },
              ]}
              onPress={() => filterByChain(chain)}>
              <View style={styles.chainIconContainer}>
                {getChainIcon(chain, 20)}
              </View>
              <Text
                style={[
                  styles.chainTabText,
                  {
                    color:
                      activeChain === chain
                        ? colors.primary
                        : colors.secondaryText,
                  },
                ]}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <ScreenHeader title="Swap" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}>
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.swapContainer}>
            {/* From Token Selection */}
            <View
              style={[
                styles.tokenSelectionContainer,
                { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
              ]}>
              <View style={styles.tokenSelectionHeader}>
                <Text
                  style={[
                    styles.tokenSelectionLabel,
                    { color: colors.secondaryText },
                  ]}>
                  From
                </Text>
                {fromToken && (
                  <Text
                    style={[
                      styles.balanceText,
                      { color: colors.secondaryText },
                    ]}>
                    Balance: {fromToken.balance} {fromToken.symbol}
                  </Text>
                )}
              </View>

              <View style={styles.tokenInputRow}>
                {renderSelectedToken(fromToken, true)}
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.0"
                  placeholderTextColor={colors.tertiaryText}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {fromToken && (
                <View style={styles.tokenValueContainer}>
                  <Text
                    style={[
                      styles.tokenValueText,
                      { color: colors.secondaryText },
                    ]}>
                    ≈ $
                    {tokenPrices.fromPrice > 0 && amount
                      ? (parseFloat(amount) * tokenPrices.fromPrice).toFixed(2)
                      : "0.00"}
                  </Text>
                </View>
              )}
            </View>

            {/* Swap Direction Button */}
            <TouchableOpacity
              style={[
                styles.swapDirectionButton,
                { backgroundColor: colors.primaryLight },
              ]}
              onPress={swapTokens}>
              <Ionicons name="swap-vertical" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* To Token Selection */}
            <View
              style={[
                styles.tokenSelectionContainer,
                { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
              ]}>
              <View style={styles.tokenSelectionHeader}>
                <Text
                  style={[
                    styles.tokenSelectionLabel,
                    { color: colors.secondaryText },
                  ]}>
                  To
                </Text>
                {toToken && (
                  <Text
                    style={[
                      styles.balanceText,
                      { color: colors.secondaryText },
                    ]}>
                    Balance: {toToken.balance || "0.00"} {toToken.symbol}
                  </Text>
                )}
              </View>

              <View style={styles.tokenInputRow}>
                {renderSelectedToken(toToken, false)}
                <View style={styles.estimatedContainer}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text
                      style={[styles.estimatedAmount, { color: colors.text }]}>
                      {estimatedAmount || "0.0"}
                    </Text>
                  )}
                </View>
              </View>

              {toToken && estimatedAmount && (
                <View style={styles.tokenValueContainer}>
                  <Text
                    style={[
                      styles.tokenValueText,
                      { color: colors.secondaryText },
                    ]}>
                    ≈ $
                    {tokenPrices.toPrice > 0
                      ? (
                          parseFloat(estimatedAmount) * tokenPrices.toPrice
                        ).toFixed(2)
                      : "0.00"}
                  </Text>
                </View>
              )}
            </View>

            {/* Minimum Received */}
            {fromToken && toToken && estimatedAmount && (
              <View
                style={[
                  styles.minReceivedContainer,
                  { backgroundColor: colors.primaryLight },
                ]}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.minReceivedText, { color: colors.primary }]}>
                  Minimum received:{" "}
                  {(parseFloat(estimatedAmount) * 0.99).toFixed(6)}{" "}
                  {toToken.symbol}
                  {tokenPrices.toPrice > 0
                    ? ` (≈$${(parseFloat(estimatedAmount) * tokenPrices.toPrice * 0.99).toFixed(2)})`
                    : ""}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Swap Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.swapButton,
              {
                backgroundColor: buttonDisabled
                  ? colors.disabledButton
                  : colors.primary,
              },
            ]}
            onPress={handleSwap}
            disabled={buttonDisabled}>
            <Text style={styles.swapButtonText}>
              {!fromToken || !toToken
                ? "Select Tokens"
                : !amount
                  ? "Enter Amount"
                  : "Swap"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Token Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor:
                theme === "dark" ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.5)",
            },
          ]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Token
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchContainer,
                { backgroundColor: theme === "dark" ? colors.card : "#F1F1F1" },
              ]}>
              <Ionicons name="search" size={20} color={colors.secondaryText} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search tokens or CA..."
                placeholderTextColor={colors.tertiaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.secondaryText}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Chain Tabs */}
            {renderChainTabs()}

            {/* Token List */}
            <FlatList
              data={filteredTokens}
              renderItem={renderTokenItem}
              keyExtractor={(item) =>
                `${item.chain}-${item.symbol}-${item.mint || item.contract}`
              }
              contentContainerStyle={styles.tokenListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color={colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.emptyListText,
                      { color: colors.secondaryText },
                    ]}>
                    No tokens found
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  swapContainer: {
    padding: 16,
  },
  tokenSelectionContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenSelectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tokenSelectionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  balanceText: {
    fontSize: 14,
  },
  tokenInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedToken: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectedTokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  selectedTokenText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
  selectTokenText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
  amountInput: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "right",
    minWidth: 150,
  },
  estimatedContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  estimatedAmount: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "right",
  },
  tokenValueContainer: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  tokenValueText: {
    fontSize: 14,
  },
  swapDirectionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: -28,
    marginBottom: -12,
    zIndex: 10,
  },
  swapDetailsContainer: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  swapDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  swapDetailLabel: {
    fontSize: 14,
  },
  swapDetailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  slippageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  minReceivedContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  minReceivedText: {
    fontSize: 14,
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 16,
    marginBottom: Platform.OS === "ios" ? 0 : 16,
  },
  swapButton: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  swapButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 10,
    borderRadius: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  quickTokensScrollView: {
    maxHeight: 50,
  },
  quickTokensContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  tokenChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tokenChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  tokenChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chainTabsWrapper: {
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingBottom: 12,
  },
  chainTabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chainTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chainTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chainIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  chainTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tokenListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tokenItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  tokenIconContainer: {
    marginRight: 12,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "500",
  },
  tokenSymbol: {
    fontSize: 14,
  },
  tokenBalance: {
    alignItems: "flex-end",
  },
  tokenBalanceText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyListContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 16,
    fontSize: 16,
  },
  tokenChainContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  chainBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  chainText: {
    fontSize: 12,
    marginLeft: 4,
  },
  selectedTokenInfo: {
    marginRight: 4,
  },
  selectedTokenChain: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  selectedTokenChainText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
