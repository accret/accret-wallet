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
import {
  useCurrentAccount,
  useCurrentSVMAccount,
  useCurrentEVMAccount,
  getAllAccountsInfo,
} from "@/lib/accountStorage";
import {
  fetchPortfolioData,
  groupTokensByChain,
  getChainName,
  formatUsdValue,
  TokenWithPrice,
  PortfolioData,
} from "@/lib/api/portfolioUtils";
import ChainSection from "@/components/ChainSection";

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

  // Ref for the interval to update portfolio data
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wallet information
  const loadWalletData = async () => {
    try {
      // Get current account
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const account = await useCurrentAccount();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const svmAccount = await useCurrentSVMAccount();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const evmAccount = await useCurrentEVMAccount();

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
    // Placeholder for send screen navigation (not implemented yet)
    Alert.alert("Coming Soon", "Send functionality will be available soon.");
  };

  // Navigate to account settings
  const navigateToAccountSettings = () => {
    router.push("/authenticated/(account)/account-settings");
  };

  // Handle token press
  const handleTokenPress = (token: TokenWithPrice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Placeholder for token detail navigation (not implemented yet)
    Alert.alert(
      `${token.data.name} (${token.data.symbol})`,
      `Chain: ${token.data.chain.name}\nBalance: ${formatUsdValue(token.usdValue)}`,
      [{ text: "OK" }],
    );
  };

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
  const groupedTokens = groupTokensByChain(portfolioData.tokens);

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
              {formatUsdValue(portfolioData.totalValueUsd)}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tokens
          </Text>

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
          ) : portfolioData.tokens.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.secondaryText}
              />
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                No tokens found in this wallet
              </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
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
  },
});
