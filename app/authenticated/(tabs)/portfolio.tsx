import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getCurrentAccount, getAllAccountsInfo } from "@/lib/accountStorage";
import {
  fetchPortfolioData,
  groupTokensByChain,
  getChainName,
  formatUsdValue,
  TokenWithPrice,
  PortfolioData,
  formatTokenAmount,
} from "@/lib/api/portfolioUtils";
import ChainSection from "@/components/ChainSection";

enum SpamStatus {
  NOT_VERIFIED = "NOT_VERIFIED",
  POSSIBLE_SPAM = "POSSIBLE_SPAM",
  VERIFIED = "VERIFIED",
}

type WalletInfo = {
  id: string;
  name: string;
  svmAddress?: string;
  evmAddress?: string;
};

export default function PortfolioScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [currentWallet, setCurrentWallet] = useState<WalletInfo | null>(null);
  const [, setAllWallets] = useState<WalletInfo[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    tokens: [],
    totalValueUsd: 0,
    isLoading: true,
    error: null,
    lastUpdated: new Date(),
  });
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // Add state for verified tokens toggle
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(true);

  // Ref for the interval to update portfolio data
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wallet information
  const loadWalletData = async () => {
    try {
      // Get current account
      const account = await getCurrentAccount();

      if (!account) {
        Alert.alert("Error", "No wallet account found");
        return;
      }

      const svmAccount = account.svm;
      const evmAccount = account.evm;

      if (account) {
        setCurrentWallet({
          id: account.userAccountID,
          name: account.userAccountName,
          svmAddress: svmAccount?.publicKey.toString(),
          evmAddress: evmAccount?.publicKey,
        });
      }

      // Get all accounts
      const accounts = await getAllAccountsInfo();
      setAllWallets(accounts);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
  };

  // Load initial portfolio data
  const loadPortfolioData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setPortfolioData((prev) => ({ ...prev, isLoading: true }));
      }
      const data = await fetchPortfolioData();
      setPortfolioData(data);
      setInitialLoading(false);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      setPortfolioData((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load portfolio data",
      }));
      setInitialLoading(false);
    }
  };

  // Setup periodic data refresh (every 10 seconds)
  useEffect(() => {
    // Load initial data
    loadWalletData();
    loadPortfolioData(true); // Show loading on initial load

    // Set up interval for refreshing data every 10 seconds
    updateIntervalRef.current = setInterval(() => {
      loadPortfolioData(false); // Don't show loading on auto-refresh
    }, 10000);

    // Clean up interval on component unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWalletData();
      loadPortfolioData(false);
      return () => {}; // cleanup function
    }, []),
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWalletData(), loadPortfolioData(false)]);
    setRefreshing(false);
  };

  // Navigate to camera screen
  const navigateToCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/authenticated/camera");
  };

  // Navigate to receive screen
  const navigateToReceive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/authenticated/receive");
  };

  // Navigate to swap screen
  const navigateToSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/authenticated/(tabs)/swap");
  };

  // Navigate to send screen
  const navigateToSend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/authenticated/send");
  };

  // Navigate to account settings
  const navigateToAccountSettings = () => {
    router.push("/authenticated/account-settings");
  };

  // Handle token press
  const handleTokenPress = (token: TokenWithPrice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Show action sheet with options
    Alert.alert(
      `${token.data.name} (${token.data.symbol})`,
      `Balance: ${formatTokenAmount(token.data.amount, token.data.decimals)} ${token.data.symbol}\nValue: ${formatUsdValue(token.usdValue)}`,
      [
        {
          text: "View Details",
          onPress: () => {
            // Navigate to token details screen
            let tokenAddress = "";

            if (token.type === "ERC20") {
              // For ERC20 tokens, use the contract address
              const erc20Data = token.data as any;
              tokenAddress = erc20Data.contractAddress;
            } else if (token.type === "SPL") {
              // For SPL tokens, use the mint address
              const splData = token.data as any;
              tokenAddress = splData.mintAddress;
            } else {
              // For native tokens, use slip44 format
              const slip44Map: Record<string, string> = {
                "solana:101": "slip44:501",
                "eip155:1": "slip44:60",
                "eip155:137": "slip44:966",
                "eip155:8453": "slip44:8453",
                "eip155:42161": "slip44:9001",
              };
              tokenAddress = slip44Map[token.data.chain.id] || "";
            }

            router.push({
              pathname: "/authenticated/token-detail",
              params: {
                network: token.data.chain.id,
                tokenAddress: tokenAddress,
                name: token.data.name,
                symbol: token.data.symbol,
                logo: token.data.logoUri,
                amount: token.data.amount,
                decimals: token.data.decimals.toString(),
                price: token.priceUsd.toString(),
                priceChange: token.priceChange24h.toString(),
                value: token.usdValue.toString(),
              },
            });
          },
        },
        {
          text: "Send",
          onPress: () => {
            // Navigate to send screen with pre-selected token chain
            router.push({
              pathname: "/authenticated/send",
              params: {
                chainId: token.data.chain.id,
                preSelectedToken: JSON.stringify({
                  type: token.type,
                  data: {
                    symbol: token.data.symbol,
                    name: token.data.name,
                    chainId: token.data.chain.id,
                    logoUri: token.data.logoUri,
                    amount: token.data.amount,
                    decimals: token.data.decimals,
                  },
                }),
              },
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Toggle the verified tokens filter
  const toggleVerifiedOnly = () => {
    Haptics.selectionAsync();
    setShowVerifiedOnly(!showVerifiedOnly);
  };

  // Filter tokens based on verification status if needed
  const filteredTokens = showVerifiedOnly
    ? portfolioData.tokens.filter(
        (token) => token.data.spamStatus === SpamStatus.VERIFIED,
      )
    : portfolioData.tokens;

  // Get wallet initials for avatar
  const getWalletInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Group tokens by chain
  const groupedTokens = groupTokensByChain(filteredTokens);

  // Custom header component with account avatar
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: colors.primary }]}
        onPress={navigateToAccountSettings}>
        {currentWallet ? (
          <Text style={styles.headerButtonText}>
            {getWalletInitials(currentWallet.name)}
          </Text>
        ) : (
          <Ionicons name="person" size={20} color="white" />
        )}
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {currentWallet?.name || "Accret"}
      </Text>

      <TouchableOpacity
        style={[styles.headerButton]}
        onPress={navigateToCamera}>
        <Ionicons name="scan-outline" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  // Calculate total value of filtered tokens
  const filteredTotalValue = filteredTokens.reduce(
    (sum, token) => sum + token.usdValue,
    0,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Portfolio Value Card */}
        <View
          style={[
            styles.portfolioCard,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <Text
            style={[styles.portfolioLabel, { color: colors.secondaryText }]}>
            Total Balance
          </Text>

          {initialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <Text style={[styles.portfolioValue, { color: colors.text }]}>
              {formatUsdValue(filteredTotalValue)}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={navigateToSend}>
            <Ionicons name="arrow-up" size={24} color="white" />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={navigateToReceive}>
            <Ionicons name="arrow-down" size={24} color="white" />
            <Text style={styles.actionButtonText}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={navigateToSwap}>
            <Ionicons name="swap-horizontal" size={24} color="white" />
            <Text style={styles.actionButtonText}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* Tokens Sections */}
        <View style={styles.tokensContainer}>
          <View style={styles.tokensSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tokens
            </Text>

            {/* Verified Tokens Toggle as Icon */}
            <TouchableOpacity
              style={[
                styles.verifiedIconButton,
                {
                  backgroundColor: showVerifiedOnly
                    ? colors.primaryLight
                    : "transparent",
                  borderColor: colors.primary,
                  borderWidth: showVerifiedOnly ? 0 : 1,
                },
              ]}
              onPress={toggleVerifiedOnly}>
              <Ionicons
                name={showVerifiedOnly ? "shield-checkmark" : "shield-outline"}
                size={16}
                color={showVerifiedOnly ? colors.primary : colors.secondaryText}
              />
              <Text
                style={[
                  styles.verifiedButtonText,
                  {
                    color: showVerifiedOnly
                      ? colors.primary
                      : colors.secondaryText,
                    marginLeft: 4,
                  },
                ]}>
                {showVerifiedOnly ? "Verified" : "All"}
              </Text>
            </TouchableOpacity>
          </View>

          {portfolioData.isLoading && !initialLoading ? (
            <View style={styles.loadingTokensContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.secondaryText }]}>
                Loading tokens...
              </Text>
            </View>
          ) : portfolioData.error ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={colors.error}
              />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {portfolioData.error}
              </Text>
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => loadPortfolioData(true)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTokens.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.secondaryText}
              />
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                {showVerifiedOnly
                  ? "No verified tokens found in this wallet"
                  : "No tokens found in this wallet"}
              </Text>
              {showVerifiedOnly && (
                <TouchableOpacity
                  style={[
                    styles.showAllButton,
                    { borderColor: colors.primary },
                  ]}
                  onPress={() => setShowVerifiedOnly(false)}>
                  <Text
                    style={[
                      styles.showAllButtonText,
                      { color: colors.primary },
                    ]}>
                    Show All Tokens
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Calculate total value by chain and sort chains by value (highest first)
            Object.entries(groupedTokens)
              .map(([chainId, tokens]) => ({
                chainId,
                tokens,
                totalValue: tokens.reduce(
                  (sum, token) => sum + token.usdValue,
                  0,
                ),
              }))
              .sort((a, b) => b.totalValue - a.totalValue)
              .map(({ chainId, tokens }) => (
                <ChainSection
                  key={chainId}
                  chainId={chainId}
                  chainName={getChainName(chainId)}
                  tokens={tokens}
                  onTokenPress={handleTokenPress}
                />
              ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  portfolioCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  portfolioLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
  },
  loadingContainer: {
    height: 36,
    justifyContent: "center",
    marginVertical: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    width: "30%",
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    marginTop: 8,
    fontWeight: "600",
  },
  tokensContainer: {
    paddingHorizontal: 20,
  },
  tokensSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  verifiedIconButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingTokensContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  showAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  showAllButtonText: {
    fontWeight: "600",
  },
});
