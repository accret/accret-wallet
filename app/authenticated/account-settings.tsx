import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getCurrentAccount,
  getAllAccounts,
  switchAccount,
  disconnectAllAccounts,
} from "@/lib/accountStorage";
import type { AccountStorage } from "@/types/accountStorage";

export default function AccountSettings() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountStorage[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AccountStorage | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Refresh account data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      return () => {}; // cleanup function
    }, []),
  );

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const allAccounts = await getAllAccounts();
      const current = await getCurrentAccount();

      setAccounts(allAccounts);
      setCurrentAccount(current);
    } catch (error) {
      console.error("Error loading accounts:", error);
      Alert.alert("Error", "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (accountId: string) => {
    try {
      await switchAccount(accountId);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to switch account:", error);
      Alert.alert("Error", "Failed to switch account");
    }
  };

  const handleAddAccount = () => {
    Alert.alert(
      "Add Account",
      "Would you like to create a new wallet or import an existing one?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Create New",
          onPress: () => router.push("/auth/create-wallet"),
        },
        {
          text: "Import Existing",
          onPress: () => router.push("/auth/import-wallet"),
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? This will remove all accounts from this device.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectAllAccounts();
              router.replace("/");
            } catch (error) {
              console.error("Failed to sign out:", error);
              Alert.alert("Error", "Failed to sign out");
            }
          },
        },
      ],
    );
  };

  const navigateToAccountDetails = (accountId: string) => {
    router.push(`/authenticated/account-details?id=${accountId}`);
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Account Settings
          </Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Account Settings
        </Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              My Accounts
            </Text>
          </View>

          {accounts.map((account) => (
            <TouchableOpacity
              key={account.userAccountID}
              style={styles.accountItem}
              onPress={() => handleAccountSelect(account.userAccountID)}>
              <View style={styles.accountItemContent}>
                <View
                  style={[
                    styles.accountAvatar,
                    {
                      backgroundColor:
                        account.userAccountID === currentAccount?.userAccountID
                          ? colors.primary
                          : colors.primaryLight,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.accountAvatarText,
                      {
                        color:
                          account.userAccountID ===
                          currentAccount?.userAccountID
                            ? "white"
                            : colors.primary,
                      },
                    ]}>
                    {getWalletInitials(account.userAccountName)}
                  </Text>
                </View>

                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {account.userAccountName}
                  </Text>
                  <View style={styles.accountMetadata}>
                    {account.userAccountID ===
                      currentAccount?.userAccountID && (
                      <View
                        style={[
                          styles.activeTag,
                          { backgroundColor: colors.primary },
                        ]}>
                        <Text style={styles.activeTagText}>Current</Text>
                      </View>
                    )}
                    {account.svm && (
                      <View
                        style={[
                          styles.chainTag,
                          {
                            backgroundColor: colors.primaryLight,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.chainTagText,
                            { color: colors.primary },
                          ]}>
                          SVM
                        </Text>
                      </View>
                    )}
                    {account.evm && (
                      <View
                        style={[
                          styles.chainTag,
                          {
                            backgroundColor: colors.primaryLight,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.chainTagText,
                            { color: colors.primary },
                          ]}>
                          EVM
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.accountActions}>
                  {/* Details button */}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() =>
                      navigateToAccountDetails(account.userAccountID)
                    }>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addAccountButton}
            onPress={handleAddAccount}>
            <View style={styles.addAccountContent}>
              <View
                style={[
                  styles.addAccountIcon,
                  { backgroundColor: colors.primaryLight },
                ]}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.addAccountText, { color: colors.text }]}>
                Add Account
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Security
            </Text>
          </View>

          <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
            <View style={styles.settingsItemContent}>
              <View style={styles.settingsItemIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={colors.error}
                />
              </View>
              <Text style={[styles.settingsItemLabel, { color: colors.error }]}>
                Sign Out (Remove All Wallets)
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.tertiaryText }]}>
            Accret Wallet v1.0.0
          </Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  placeholderButton: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  accountItem: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  accountItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  accountMetadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  activeTagText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  chainTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  chainTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingsItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsItemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  versionContainer: {
    padding: 24,
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
  },
  addAccountButton: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    padding: 16,
  },
  addAccountContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  addAccountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addAccountText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
