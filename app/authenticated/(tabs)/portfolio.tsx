import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  useCurrentAccount,
  useCurrentSVMAccount,
  useCurrentEVMAccount,
  getAllAccountsInfo,
  switchAccount,
} from "@/lib/accountStorage";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

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
  const [allWallets, setAllWallets] = useState<WalletInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

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

  // Initial data load
  useEffect(() => {
    loadWalletData();
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWalletData();
      return () => {}; // cleanup function
    }, []),
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  // Format address for display
  const formatAddress = (address?: string) => {
    if (!address) return "Not available";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Copy address to clipboard with haptic feedback
  const copyToClipboard = async (
    text?: string,
    networkType?: "SVM" | "EVM",
  ) => {
    if (!text) return;

    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Set the copied address ID for visual feedback
      setCopiedAddress(`${networkType}-${text}`);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Handle wallet selection
  const handleWalletSelect = async (walletId: string) => {
    if (walletId === currentWallet?.id) return;

    try {
      // Show loading indicator
      setRefreshing(true);

      await switchAccount(walletId);

      // Force complete reload of wallet data to ensure UI is up to date
      await loadWalletData();
    } catch (error) {
      console.error("Failed to switch wallet:", error);
      Alert.alert("Error", "Failed to switch wallet");
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to account settings
  const navigateToAccountSettings = () => {
    router.push("/authenticated/(account)/account-settings");
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

  // Get wallet initials
  const getWalletInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Current Wallet Card */}
        {currentWallet && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
            ]}>
            <View style={styles.addressContainer}>
              <View style={styles.networkContainer}>
                <View
                  style={[
                    styles.networkBadge,
                    { backgroundColor: colors.primaryLight },
                  ]}>
                  <Text
                    style={[styles.networkLabel, { color: colors.primary }]}>
                    SVM
                  </Text>
                </View>
                <Text
                  style={[styles.addressText, { color: colors.secondaryText }]}>
                  {formatAddress(currentWallet.svmAddress)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() =>
                    copyToClipboard(currentWallet.svmAddress, "SVM")
                  }>
                  {copiedAddress === `SVM-${currentWallet.svmAddress}` ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.success}
                    />
                  ) : (
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={colors.secondaryText}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.networkContainer}>
                <View
                  style={[
                    styles.networkBadge,
                    { backgroundColor: colors.primaryLight },
                  ]}>
                  <Text
                    style={[styles.networkLabel, { color: colors.primary }]}>
                    EVM
                  </Text>
                </View>
                <Text
                  style={[styles.addressText, { color: colors.secondaryText }]}>
                  {formatAddress(currentWallet.evmAddress)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() =>
                    copyToClipboard(currentWallet.evmAddress, "EVM")
                  }>
                  {copiedAddress === `EVM-${currentWallet.evmAddress}` ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.success}
                    />
                  ) : (
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={colors.secondaryText}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.receiveButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={navigateToReceive}>
              <Ionicons name="qr-code-outline" size={20} color="white" />
              <Text style={styles.receiveButtonText}>Receive</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All Wallets List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            All Wallets ({allWallets.length})
          </Text>

          {allWallets.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={[
                styles.walletItem,
                {
                  backgroundColor: theme === "dark" ? colors.card : "#FFFFFF",
                  borderColor:
                    wallet.id === currentWallet?.id
                      ? colors.primary
                      : "transparent",
                },
              ]}
              onPress={() => handleWalletSelect(wallet.id)}
              activeOpacity={0.7}>
              <View style={styles.walletItemContent}>
                <View style={styles.walletNameContainer}>
                  <View
                    style={[
                      styles.walletAvatar,
                      {
                        backgroundColor:
                          wallet.id === currentWallet?.id
                            ? colors.primary
                            : colors.primaryLight,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.walletAvatarText,
                        {
                          color:
                            wallet.id === currentWallet?.id
                              ? "white"
                              : colors.primary,
                        },
                      ]}>
                      {getWalletInitials(wallet.name)}
                    </Text>
                  </View>
                  <Text style={[styles.walletName, { color: colors.text }]}>
                    {wallet.name}
                  </Text>
                </View>
                <View style={styles.walletActions}>
                  {wallet.id === currentWallet?.id && (
                    <View
                      style={[
                        styles.activeTag,
                        { backgroundColor: colors.primary },
                      ]}>
                      <Text style={styles.activeTagText}>Active</Text>
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.secondaryText}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  addressContainer: {
    gap: 12,
    marginBottom: 16,
  },
  networkContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  networkLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  copyButton: {
    padding: 6,
  },
  receiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 14,
  },
  receiveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  walletItem: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  walletItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  walletNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  walletAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  walletActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeTagText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
