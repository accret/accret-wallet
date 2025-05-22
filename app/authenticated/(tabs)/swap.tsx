import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ScreenHeader from "../ScreenHeader";
import {
  SolanaIcon,
  EthereumIcon,
  PolygonIcon,
  BaseIcon,
  ArbitrumIcon,
  TokenPlaceholderIcon,
} from "@/icons";
import {
  fetchSupportedTokens,
  getQuote,
  executeBridgeTransaction,
  type BridgeParams,
  type QuoteResult,
} from "@/lib/tx/mayan-bridge";
import { ChainName } from "@mayanfinance/swap-sdk";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getExplorerUrl } from "@/lib/tx/explorerUrl";
import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { authenticateWithBiometricsDetailed } from "@/lib/auth/biometricAuth";

// Chain definitions
const CHAINS = [
  {
    id: "solana:101",
    name: "Solana",
    symbol: "Solana",
    icon: SolanaIcon,
    mayanName: "solana" as ChainName,
  },
  {
    id: "eip155:1",
    name: "Ethereum",
    symbol: "Ethereum",
    icon: EthereumIcon,
    mayanName: "ethereum" as ChainName,
  },
  {
    id: "eip155:137",
    name: "Polygon",
    symbol: "Polygon",
    icon: PolygonIcon,
    mayanName: "polygon" as ChainName,
  },
  {
    id: "eip155:8453",
    name: "Base",
    symbol: "Base",
    icon: BaseIcon,
    mayanName: "base" as ChainName,
  },
  {
    id: "eip155:42161",
    name: "Arbitrum",
    symbol: "Arbitrum",
    icon: ArbitrumIcon,
    mayanName: "arbitrum" as ChainName,
  },
];

// Token interface
interface Token {
  name: string;
  symbol: string;
  mint?: string;
  contract?: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  chain: string;
  balance?: string;
  value?: string;
  wrappedAddress?: string;
}

export default function SwapScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();

  // State for chain and token selection
  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain, setToChain] = useState(CHAINS[1]);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);

  // State for token amounts
  const [amount, setAmount] = useState("");

  // State for modals
  const [showFromChainModal, setShowFromChainModal] = useState(false);
  const [showToChainModal, setShowToChainModal] = useState(false);
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);

  // State for loading and data
  const [supportedTokens, setSupportedTokens] = useState<
    Record<string, Token[]>
  >({});
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search state - separate states for from and to tokens
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [filteredFromTokens, setFilteredFromTokens] = useState<Token[]>([]);
  const [filteredToTokens, setFilteredToTokens] = useState<Token[]>([]);

  // Get account for addresses
  const [account, setAccount] = useState<any>(null);

  // Debounced route fetching
  const [debouncedAmount, setDebouncedAmount] = useState(amount);

  // Add loading state for quote
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(amount);
    }, 800);

    return () => clearTimeout(timer);
  }, [amount]);

  useEffect(() => {
    if (parseFloat(debouncedAmount) > 0) {
      fetchRoutes();
    } else {
      setQuoteResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAmount]);

  // Load user account
  useEffect(() => {
    const loadAccount = async () => {
      const currentAccount = await getCurrentAccount();
      setAccount(currentAccount);
    };
    loadAccount();
  }, []);

  // Load supported tokens when chains change
  useEffect(() => {
    if (fromChain) {
      loadSupportedTokens(fromChain.id, "from");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromChain]);

  useEffect(() => {
    if (toChain) {
      loadSupportedTokens(toChain.id, "to");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toChain]);

  // Filter "from" tokens based on search query
  useEffect(() => {
    if (!supportedTokens[fromChain.mayanName]) {
      setFilteredFromTokens([]);
      return;
    }

    if (fromSearchQuery.trim() === "") {
      setFilteredFromTokens(supportedTokens[fromChain.mayanName] || []);
      return;
    }

    const query = fromSearchQuery.toLowerCase();
    const filtered = (supportedTokens[fromChain.mayanName] || []).filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        (token.contract?.toLowerCase() || "").includes(query) ||
        (token.mint?.toLowerCase() || "").includes(query),
    );
    setFilteredFromTokens(filtered);
  }, [fromSearchQuery, supportedTokens, fromChain]);

  // Filter "to" tokens based on search query
  useEffect(() => {
    if (!supportedTokens[toChain.mayanName]) {
      setFilteredToTokens([]);
      return;
    }

    if (toSearchQuery.trim() === "") {
      setFilteredToTokens(supportedTokens[toChain.mayanName] || []);
      return;
    }

    const query = toSearchQuery.toLowerCase();
    const filtered = (supportedTokens[toChain.mayanName] || []).filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        (token.contract?.toLowerCase() || "").includes(query) ||
        (token.mint?.toLowerCase() || "").includes(query),
    );
    setFilteredToTokens(filtered);
  }, [toSearchQuery, supportedTokens, toChain]);

  // Load supported tokens for a chain
  const loadSupportedTokens = async (
    chainId: string,
    chainType: "from" | "to",
  ) => {
    try {
      setIsLoadingTokens(true);

      // Determine which chain to use based on the chainType
      const chain = chainType === "from" ? fromChain : toChain;

      // Fetch tokens if they haven't been loaded for this chain yet
      if (!supportedTokens[chain.mayanName]) {
        const tokens = await fetchSupportedTokens(chainId as any);
        setSupportedTokens((prev) => ({ ...prev, ...tokens }));
      }

      // Set default token (first in the list) if none selected yet
      if (chainType === "from") {
        if (
          !fromToken &&
          supportedTokens[chain.mayanName] &&
          supportedTokens[chain.mayanName].length > 0
        ) {
          setFromToken(supportedTokens[chain.mayanName][0]);
        }
        setFilteredFromTokens(supportedTokens[chain.mayanName] || []);
      } else {
        if (
          !toToken &&
          supportedTokens[chain.mayanName] &&
          supportedTokens[chain.mayanName].length > 0
        ) {
          setToToken(supportedTokens[chain.mayanName][0]);
        }
        setFilteredToTokens(supportedTokens[chain.mayanName] || []);
      }
    } catch (error) {
      console.error(
        `Error loading supported tokens for ${chainType} chain:`,
        error,
      );
      Alert.alert("Error", "Failed to load supported tokens");
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Fetch available routes
  const fetchRoutes = async () => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      setError(null); // Clear any previous errors
      setIsLoadingQuote(true); // Set loading state
      // Get the destination address based on selected chain type
      let destAddr = "";
      if (toChain.id.startsWith("solana")) {
        destAddr = account?.svm?.publicKey.toString() || "";
      } else {
        destAddr = account?.evm?.publicKey || "";
      }

      if (!destAddr) {
        setError(`No ${toChain.name} account found`);
        return;
      }

      // Create bridge params
      const params: BridgeParams = {
        fromChain: fromChain.mayanName,
        fromToken: fromToken.contract || fromToken.mint || "",
        toChain: toChain.mayanName,
        toToken: toToken.contract || toToken.mint || "",
        amount: parseFloat(amount),
        destAddr,
        slippageBps: "300", // 3% slippage
      };

      // Get quote
      const quote = await getQuote(params);
      setQuoteResult(quote);
    } catch (error: any) {
      console.log("Error fetching routes:", error);
      // Handle specific error cases
      if (error.code === "AMOUNT_TOO_SMALL" && error.data?.minAmountIn) {
        setError(
          `Amount too small. Minimum amount required: ${error.data.minAmountIn} ${fromToken?.symbol}`,
        );
      } else {
        setError(error.message || "Failed to fetch swap routes");
      }
      setQuoteResult(null);
    } finally {
      setIsLoadingQuote(false); // Clear loading state
    }
  };

  // Show confirmation modal
  const handleSwapClick = () => {
    if (!quoteResult || !account) {
      setError("Missing quote or account information");
      return;
    }
    setShowConfirmationModal(true);
  };

  // Execute the swap
  const executeSwap = async () => {
    if (!quoteResult || !account) {
      setError("Missing quote or account information");
      return;
    }

    try {
      setIsSwapping(true);
      setError(null);
      setShowConfirmationModal(false);

      // First authenticate using biometrics
      const authResult =
        await authenticateWithBiometricsDetailed("transaction");

      if (!authResult.success) {
        if (authResult.canceled) {
          setError("Swap cancelled by user.");
        } else {
          setError(
            authResult.error || "Authentication failed. Swap cancelled.",
          );
        }
        setIsSwapping(false);
        return;
      }

      // Get the destination address based on selected chain type
      let destAddr = "";
      if (toChain.id.startsWith("solana")) {
        destAddr = account.svm.publicKey.toString();
      } else {
        destAddr = account.evm.publicKey;
      }

      // Execute the transaction
      const txHash = await executeBridgeTransaction(
        quoteResult.quote,
        destAddr,
      );

      // Set transaction hash and show success modal
      setTransactionHash(txHash);
      setShowSuccessModal(true);

      // Reset form state
      setAmount("");
      setQuoteResult(null);
      setError(null);
    } catch (error: any) {
      console.error("Error executing swap:", error);
      if (
        error.message?.includes("Transaction") &&
        error.message?.includes("reverted")
      ) {
        setError(
          "Transaction failed. Please try again with a different amount or token pair.",
        );
      } else {
        setError(error.message || "Failed to execute swap transaction");
      }
    } finally {
      setIsSwapping(false);
    }
  };

  // Copy transaction hash to clipboard
  const copyTransactionHash = async () => {
    if (transactionHash) {
      await Clipboard.setStringAsync(transactionHash);
      Alert.alert("Copied", "Transaction hash copied to clipboard");
    }
  };

  // Open transaction in explorer
  const openTransactionInExplorer = async () => {
    if (!transactionHash || !fromChain) return;

    const url = getExplorerUrl(fromChain.id as any, transactionHash);
    if (url) {
      await Linking.openURL(url);
    }
  };

  // Swap from and to chains/tokens
  const handleSwapDirection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tempChain = fromChain;
    const tempToken = fromToken;

    setFromChain(toChain);
    setFromToken(toToken);

    setToChain(tempChain);
    setToToken(tempToken);

    // Clear routes as they're no longer valid
    setQuoteResult(null);
  };

  // Set maximum amount from token balance
  const handleSetMaxAmount = () => {
    if (!fromToken || !fromToken.balance) return;

    setAmount(fromToken.balance);
    // Trigger route fetch with the new amount
    setTimeout(() => fetchRoutes(), 100);
  };

  // Handle token selection
  const handleSelectFromToken = (token: Token) => {
    setFromToken(token);
    setShowFromTokenModal(false);
    setFromSearchQuery("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelectToToken = (token: Token) => {
    setToToken(token);
    setShowToTokenModal(false);
    setToSearchQuery("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Reset search when modals close
  const handleCloseFromTokenModal = () => {
    setShowFromTokenModal(false);
    setFromSearchQuery("");
  };

  const handleCloseToTokenModal = () => {
    setShowToTokenModal(false);
    setToSearchQuery("");
  };

  // Render chain icon based on chain ID
  const renderChainIcon = (chainId: string, size = 24) => {
    const chain = CHAINS.find((c) => c.id === chainId);
    if (!chain) return null;

    const IconComponent = chain.icon;
    return <IconComponent width={size} height={size} />;
  };

  // Render token item
  const renderTokenItem = ({
    item,
    type,
  }: {
    item: Token;
    type: "from" | "to";
  }) => {
    const isSelected =
      type === "from"
        ? fromToken?.symbol === item.symbol
        : toToken?.symbol === item.symbol;

    return (
      <TouchableOpacity
        style={[
          styles.tokenListItem,
          {
            borderBottomColor: theme === "dark" ? "#2A2A2A" : colors.border,
          },
        ]}
        onPress={() =>
          type === "from"
            ? handleSelectFromToken(item)
            : handleSelectToToken(item)
        }>
        <View style={styles.tokenListIconContainer}>
          {item.logoURI ? (
            <Image
              source={{ uri: item.logoURI }}
              style={styles.tokenListIcon}
              onError={() => {}}
            />
          ) : (
            <TokenPlaceholderIcon width={40} height={40} symbol={item.symbol} />
          )}
        </View>
        <View style={styles.tokenListInfo}>
          <Text style={[styles.tokenListSymbol, { color: colors.text }]}>
            {item.symbol}
          </Text>
          <Text style={[styles.tokenListName, { color: colors.secondaryText }]}>
            {item.name}
          </Text>
          {/* Show token address/mint if available */}
          {(item.contract || item.mint) && (
            <Text
              style={[styles.tokenListAddress, { color: colors.tertiaryText }]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {item.wrappedAddress || item.contract || item.mint}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Swap" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}>
        {/* From Section */}
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
          From
        </Text>
        <View style={[styles.selectionCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.chainSelector}
            onPress={() => setShowFromChainModal(true)}>
            <View style={styles.chainIconContainer}>
              {renderChainIcon(fromChain.id, 32)}
            </View>
            <View style={styles.chainInfo}>
              <Text style={[styles.chainSymbol, { color: colors.text }]}>
                {fromChain.symbol}
              </Text>
              <Text style={[styles.chainName, { color: colors.secondaryText }]}>
                {fromChain.name}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tokenSelector}
            onPress={() => setShowFromTokenModal(true)}>
            <View style={styles.tokenInfo}>
              {fromToken ? (
                <>
                  <View style={styles.tokenIconContainer}>
                    {fromToken.logoURI ? (
                      <Image
                        source={{ uri: fromToken.logoURI }}
                        style={styles.tokenIcon}
                        onError={() => {}}
                      />
                    ) : (
                      <TokenPlaceholderIcon
                        width={24}
                        height={24}
                        symbol={fromToken.symbol}
                      />
                    )}
                  </View>
                  <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                    {fromToken.symbol}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.selectTokenText,
                    { color: colors.secondaryText },
                  ]}>
                  Select a token
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        {/* Swap Direction Button */}
        <View style={styles.swapDirectionContainer}>
          <TouchableOpacity
            style={[
              styles.swapButton,
              { backgroundColor: colors.primaryLight },
            ]}
            onPress={handleSwapDirection}>
            <Ionicons name="swap-vertical" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* To Section */}
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
          To
        </Text>
        <View style={[styles.selectionCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.chainSelector}
            onPress={() => setShowToChainModal(true)}>
            <View style={styles.chainIconContainer}>
              {renderChainIcon(toChain.id, 32)}
            </View>
            <View style={styles.chainInfo}>
              <Text style={[styles.chainSymbol, { color: colors.text }]}>
                {toChain.symbol}
              </Text>
              <Text style={[styles.chainName, { color: colors.secondaryText }]}>
                {toChain.name}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tokenSelector}
            onPress={() => setShowToTokenModal(true)}>
            <View style={styles.tokenInfo}>
              {toToken ? (
                <>
                  <View style={styles.tokenIconContainer}>
                    {toToken.logoURI ? (
                      <Image
                        source={{ uri: toToken.logoURI }}
                        style={styles.tokenIcon}
                        onError={() => {}}
                      />
                    ) : (
                      <TokenPlaceholderIcon
                        width={24}
                        height={24}
                        symbol={toToken.symbol}
                      />
                    )}
                  </View>
                  <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                    {toToken.symbol}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.selectTokenText,
                    { color: colors.secondaryText },
                  ]}>
                  Select a token
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        {/* Amount Section */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.secondaryText, marginTop: 16 },
          ]}>
          Amount
        </Text>
        <View
          style={[styles.amountContainer, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="0.0"
            placeholderTextColor={colors.tertiaryText}
            keyboardType="numeric"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
            }}
          />
          {fromToken?.balance && (
            <TouchableOpacity
              style={[
                styles.maxButton,
                { backgroundColor: colors.primaryLight },
              ]}
              onPress={handleSetMaxAmount}>
              <Text style={[styles.maxButtonText, { color: colors.primary }]}>
                MAX
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quote Display */}
        {(quoteResult || isLoadingQuote) && (
          <View
            style={[styles.quoteContainer, { backgroundColor: colors.card }]}>
            {isLoadingQuote ? (
              <View style={styles.quoteLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.quoteLoadingText,
                    { color: colors.secondaryText },
                  ]}>
                  Fetching best quote...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.quoteRow}>
                  <Text
                    style={[
                      styles.quoteLabel,
                      { color: colors.secondaryText },
                    ]}>
                    You'll receive at least
                  </Text>
                  <Text style={[styles.quoteValue, { color: colors.text }]}>
                    {quoteResult?.details.minAmountOut}{" "}
                    {quoteResult?.details.toTokenName}
                  </Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text
                    style={[
                      styles.quoteLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Estimated fee
                  </Text>
                  <Text style={[styles.quoteValue, { color: colors.text }]}>
                    ${quoteResult?.details.estimatedFee}
                  </Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text
                    style={[
                      styles.quoteLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Route
                  </Text>
                  <Text style={[styles.quoteValue, { color: colors.text }]}>
                    {quoteResult?.details.fromChain} →{" "}
                    {quoteResult?.details.toChain}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.error + "15" }, // 15 is hex for 8% opacity
            ]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Swap Button */}
        <TouchableOpacity
          style={[
            styles.swapActionButton,
            {
              backgroundColor:
                fromToken &&
                toToken &&
                amount &&
                parseFloat(amount) > 0 &&
                quoteResult
                  ? colors.primary
                  : colors.disabledButton,
            },
          ]}
          disabled={
            !(
              fromToken &&
              toToken &&
              amount &&
              parseFloat(amount) > 0 &&
              quoteResult
            ) || isSwapping
          }
          onPress={handleSwapClick}>
          {isSwapping ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.swapActionButtonText}>Swap</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Chain Selection Bottom Sheet - From */}
      <Modal
        visible={showFromChainModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFromChainModal(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.bottomSheetHandle}>
              <View
                style={[
                  styles.bottomSheetIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Select a network
              </Text>
              <TouchableOpacity
                style={styles.bottomSheetCloseButton}
                onPress={() => setShowFromChainModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.networkGrid}>
              {CHAINS.map((chain) => (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.networkGridItem,
                    {
                      backgroundColor:
                        chain.id === fromChain.id
                          ? theme === "dark"
                            ? "#1F3A60"
                            : colors.primaryLight
                          : theme === "dark"
                            ? "#2A2A2A"
                            : colors.card,
                    },
                  ]}
                  onPress={() => {
                    setFromChain(chain);
                    setFromToken(null);
                    setShowFromChainModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                  <View style={styles.networkIconContainer}>
                    {renderChainIcon(chain.id, 40)}
                  </View>
                  <Text style={[styles.networkSymbol, { color: colors.text }]}>
                    {chain.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Chain Selection Bottom Sheet - To */}
      <Modal
        visible={showToChainModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowToChainModal(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.bottomSheetHandle}>
              <View
                style={[
                  styles.bottomSheetIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Select a network
              </Text>
              <TouchableOpacity
                style={styles.bottomSheetCloseButton}
                onPress={() => setShowToChainModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.networkGrid}>
              {CHAINS.map((chain) => (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.networkGridItem,
                    {
                      backgroundColor:
                        chain.id === toChain.id
                          ? theme === "dark"
                            ? "#1F3A60"
                            : colors.primaryLight
                          : theme === "dark"
                            ? "#2A2A2A"
                            : colors.card,
                    },
                  ]}
                  onPress={() => {
                    setToChain(chain);
                    setToToken(null);
                    setShowToChainModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                  <View style={styles.networkIconContainer}>
                    {renderChainIcon(chain.id, 40)}
                  </View>
                  <Text style={[styles.networkSymbol, { color: colors.text }]}>
                    {chain.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Token Selection Bottom Sheet - From */}
      <Modal
        visible={showFromTokenModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseFromTokenModal}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.bottomSheetHandle}>
              <View
                style={[
                  styles.bottomSheetIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Select a token
              </Text>
              <TouchableOpacity
                style={styles.bottomSheetCloseButton}
                onPress={handleCloseFromTokenModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedNetworkIndicator}>
              <Text
                style={[
                  styles.selectedNetworkText,
                  { color: colors.secondaryText },
                ]}>
                {fromChain.name} Network
              </Text>
            </View>

            <View
              style={[
                styles.searchContainerBottomSheet,
                {
                  backgroundColor:
                    theme === "dark" ? "#2A2A2A" : colors.inputBackground,
                },
              ]}>
              <Ionicons name="search" size={20} color={colors.secondaryText} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, symbol, or address"
                placeholderTextColor={colors.tertiaryText}
                value={fromSearchQuery}
                onChangeText={setFromSearchQuery}
                autoFocus={false}
                returnKeyType="search"
              />
              {fromSearchQuery !== "" && (
                <TouchableOpacity onPress={() => setFromSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.secondaryText}
                  />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingTokens ? (
              <View style={styles.loadingTokensContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.emptyResultsText,
                    { color: colors.secondaryText },
                  ]}>
                  Loading tokens...
                </Text>
              </View>
            ) : filteredFromTokens.length === 0 ? (
              <View style={styles.emptyResultsContainer}>
                <Ionicons
                  name="search-outline"
                  size={50}
                  color={colors.secondaryText}
                />
                <Text
                  style={[
                    styles.emptyResultsText,
                    { color: colors.secondaryText },
                  ]}>
                  No tokens found matching "{fromSearchQuery}"
                </Text>
                <TouchableOpacity
                  style={[
                    styles.clearSearchButton,
                    { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setFromSearchQuery("")}>
                  <Text
                    style={[
                      styles.clearSearchButtonText,
                      { color: colors.primary },
                    ]}>
                    Clear Search
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                style={styles.tokenList}
                data={filteredFromTokens}
                keyExtractor={(item, index) => `${item.symbol}-${index}`}
                renderItem={({ item }) =>
                  renderTokenItem({ item, type: "from" })
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={20}
                windowSize={10}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Token Selection Bottom Sheet - To */}
      <Modal
        visible={showToTokenModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseToTokenModal}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.bottomSheetHandle}>
              <View
                style={[
                  styles.bottomSheetIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Select a token
              </Text>
              <TouchableOpacity
                style={styles.bottomSheetCloseButton}
                onPress={handleCloseToTokenModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedNetworkIndicator}>
              <Text
                style={[
                  styles.selectedNetworkText,
                  { color: colors.secondaryText },
                ]}>
                {toChain.name} Network
              </Text>
            </View>

            <View
              style={[
                styles.searchContainerBottomSheet,
                {
                  backgroundColor:
                    theme === "dark" ? "#2A2A2A" : colors.inputBackground,
                },
              ]}>
              <Ionicons name="search" size={20} color={colors.secondaryText} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, symbol, or address"
                placeholderTextColor={colors.tertiaryText}
                value={toSearchQuery}
                onChangeText={setToSearchQuery}
                autoFocus={false}
                returnKeyType="search"
              />
              {toSearchQuery !== "" && (
                <TouchableOpacity onPress={() => setToSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.secondaryText}
                  />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingTokens ? (
              <View style={styles.loadingTokensContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.emptyResultsText,
                    { color: colors.secondaryText },
                  ]}>
                  Loading tokens...
                </Text>
              </View>
            ) : filteredToTokens.length === 0 ? (
              <View style={styles.emptyResultsContainer}>
                <Ionicons
                  name="search-outline"
                  size={50}
                  color={colors.secondaryText}
                />
                <Text
                  style={[
                    styles.emptyResultsText,
                    { color: colors.secondaryText },
                  ]}>
                  No tokens found matching "{toSearchQuery}"
                </Text>
                <TouchableOpacity
                  style={[
                    styles.clearSearchButton,
                    { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setToSearchQuery("")}>
                  <Text
                    style={[
                      styles.clearSearchButtonText,
                      { color: colors.primary },
                    ]}>
                    Clear Search
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                style={styles.tokenList}
                data={filteredToTokens}
                keyExtractor={(item, index) => `${item.symbol}-${index}`}
                renderItem={({ item }) => renderTokenItem({ item, type: "to" })}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={20}
                windowSize={10}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmationModal(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.bottomSheetHandle}>
              <View
                style={[
                  styles.bottomSheetIndicator,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Confirm Swap
              </Text>
              <TouchableOpacity
                style={styles.bottomSheetCloseButton}
                onPress={() => setShowConfirmationModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.confirmationContent}>
              {/* From Token */}
              <View
                style={[
                  styles.confirmationCard,
                  { backgroundColor: colors.card },
                ]}>
                <Text
                  style={[
                    styles.confirmationLabel,
                    { color: colors.secondaryText },
                  ]}>
                  You Pay
                </Text>
                <View style={styles.confirmationTokenContainer}>
                  <View style={styles.confirmationTokenInfo}>
                    {fromToken?.logoURI ? (
                      <Image
                        source={{ uri: fromToken.logoURI }}
                        style={styles.confirmationTokenIcon}
                      />
                    ) : (
                      <TokenPlaceholderIcon
                        width={32}
                        height={32}
                        symbol={fromToken?.symbol || ""}
                      />
                    )}
                    <View style={styles.confirmationTokenDetails}>
                      <Text
                        style={[
                          styles.confirmationTokenAmount,
                          { color: colors.text },
                        ]}>
                        {amount} {fromToken?.symbol}
                      </Text>
                      <Text
                        style={[
                          styles.confirmationChainName,
                          { color: colors.secondaryText },
                        ]}>
                        on {fromChain.name}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Arrow Icon */}
              <View style={styles.confirmationArrowContainer}>
                <View
                  style={[
                    styles.confirmationArrowCircle,
                    { backgroundColor: colors.primaryLight },
                  ]}>
                  <Ionicons
                    name="arrow-down"
                    size={24}
                    color={colors.primary}
                  />
                </View>
              </View>

              {/* To Token */}
              <View
                style={[
                  styles.confirmationCard,
                  { backgroundColor: colors.card },
                ]}>
                <Text
                  style={[
                    styles.confirmationLabel,
                    { color: colors.secondaryText },
                  ]}>
                  You Receive
                </Text>
                <View style={styles.confirmationTokenContainer}>
                  <View style={styles.confirmationTokenInfo}>
                    {toToken?.logoURI ? (
                      <Image
                        source={{ uri: toToken.logoURI }}
                        style={styles.confirmationTokenIcon}
                      />
                    ) : (
                      <TokenPlaceholderIcon
                        width={32}
                        height={32}
                        symbol={toToken?.symbol || ""}
                      />
                    )}
                    <View style={styles.confirmationTokenDetails}>
                      <Text
                        style={[
                          styles.confirmationTokenAmount,
                          { color: colors.text },
                        ]}>
                        {quoteResult?.details.minAmountOut} {toToken?.symbol}
                      </Text>
                      <Text
                        style={[
                          styles.confirmationChainName,
                          { color: colors.secondaryText },
                        ]}>
                        on {toChain.name}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Transaction Details */}
              <View
                style={[
                  styles.confirmationDetailsCard,
                  { backgroundColor: colors.card },
                ]}>
                <View style={styles.confirmationDetailRow}>
                  <Text
                    style={[
                      styles.confirmationDetailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Rate
                  </Text>
                  <Text
                    style={[
                      styles.confirmationDetailValue,
                      { color: colors.text },
                    ]}>
                    1 {fromToken?.symbol} ≈{" "}
                    {(
                      Number(quoteResult?.details.minAmountOut) / Number(amount)
                    ).toFixed(6)}{" "}
                    {toToken?.symbol}
                  </Text>
                </View>

                <View style={styles.confirmationDetailRow}>
                  <Text
                    style={[
                      styles.confirmationDetailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Network Fee
                  </Text>
                  <Text
                    style={[
                      styles.confirmationDetailValue,
                      { color: colors.text },
                    ]}>
                    ${quoteResult?.details.estimatedFee}
                  </Text>
                </View>

                <View style={styles.confirmationDetailRow}>
                  <Text
                    style={[
                      styles.confirmationDetailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Route
                  </Text>
                  <Text
                    style={[
                      styles.confirmationDetailValue,
                      { color: colors.text },
                    ]}>
                    {quoteResult?.details.fromChain} →{" "}
                    {quoteResult?.details.toChain}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={[
                  styles.confirmationCancelButton,
                  { backgroundColor: colors.card },
                ]}
                onPress={() => setShowConfirmationModal(false)}>
                <Text
                  style={[
                    styles.confirmationCancelButtonText,
                    { color: colors.text },
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmationConfirmButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={executeSwap}>
                <Text style={styles.confirmationConfirmButtonText}>
                  Confirm Swap
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View
            style={[
              styles.bottomSheetContainer,
              {
                backgroundColor:
                  theme === "dark" ? "#1E1E1E" : colors.background,
              },
            ]}>
            <View style={styles.successContent}>
              {/* Success Animation */}
              <View style={styles.successIconContainer}>
                <View
                  style={[
                    styles.successIconCircle,
                    { backgroundColor: colors.primary + "20" },
                  ]}>
                  <Ionicons name="checkmark" size={48} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.successTitle, { color: colors.text }]}>
                Swap Successful!
              </Text>

              <Text
                style={[
                  styles.successDescription,
                  { color: colors.secondaryText },
                ]}>
                Your swap has been successfully executed
              </Text>

              {/* Transaction Hash Card */}
              <TouchableOpacity
                style={[styles.hashCard, { backgroundColor: colors.card }]}
                onPress={copyTransactionHash}>
                <Text
                  style={[styles.hashLabel, { color: colors.secondaryText }]}>
                  Transaction Hash
                </Text>
                <View style={styles.hashContainer}>
                  <Text
                    style={[styles.hashText, { color: colors.text }]}
                    numberOfLines={1}>
                    {transactionHash}
                  </Text>
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.successActions}>
                <TouchableOpacity
                  style={[
                    styles.explorerButton,
                    { backgroundColor: colors.card },
                  ]}
                  onPress={openTransactionInExplorer}>
                  <Text
                    style={[styles.explorerButtonText, { color: colors.text }]}>
                    View in Explorer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.doneButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.back();
                  }}>
                  <Text style={styles.doneButtonText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  selectionCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  chainSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  chainIconContainer: {
    marginRight: 12,
  },
  chainInfo: {
    flex: 1,
  },
  chainSymbol: {
    fontSize: 18,
    fontWeight: "600",
  },
  chainName: {
    fontSize: 14,
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    justifyContent: "space-between",
  },
  tokenInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenIconContainer: {
    marginRight: 12,
  },
  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectTokenText: {
    fontSize: 16,
  },
  swapDirectionContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
  },
  maxButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  swapActionButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  swapActionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  chainsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
  },
  chainGridItem: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.65%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  chainGridIcon: {
    marginBottom: 8,
  },
  chainGridSymbol: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchContainerBottomSheet: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  loadingTokensContainer: {
    padding: 24,
    alignItems: "center",
  },
  tokenListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tokenListIconContainer: {
    marginRight: 16,
  },
  tokenListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenListInfo: {
    flex: 1,
  },
  tokenListSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },
  tokenListName: {
    fontSize: 14,
  },
  tokenListAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  tokenList: {
    maxHeight: 400,
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    maxHeight: "80%",
  },
  bottomSheetHandle: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  bottomSheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  bottomSheetCloseButton: {
    padding: 4,
  },
  selectedNetworkIndicator: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  selectedNetworkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Network Grid Styles
  networkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 16,
  },
  networkGridItem: {
    width: "30%",
    aspectRatio: 1,
    margin: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  networkIconContainer: {
    marginBottom: 12,
  },
  networkSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Empty Results
  emptyResultsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyResultsText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  quoteContainer: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quoteLabel: {
    fontSize: 14,
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  quoteLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  quoteLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  // Confirmation Modal Styles
  confirmationContent: {
    padding: 16,
  },
  confirmationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  confirmationLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  confirmationTokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmationTokenInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmationTokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  confirmationTokenDetails: {
    flex: 1,
  },
  confirmationTokenAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  confirmationChainName: {
    fontSize: 14,
  },
  confirmationArrowContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  confirmationArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationDetailsCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  confirmationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmationDetailLabel: {
    fontSize: 14,
  },
  confirmationDetailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  confirmationActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  confirmationCancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmationConfirmButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationConfirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Success Modal Styles
  successContent: {
    padding: 24,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  hashCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  hashLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  hashContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hashText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  successActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  explorerButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  explorerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  doneButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
