import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import {
  getAccountById,
  saveAccountName,
  disconnectAccount,
  getSVMAccountById,
  getEVMAccountById,
  getAllAccounts,
} from "@/lib/accountStorage";
import type {
  AccountStorage,
  SVM_Account,
  EVM_Account,
} from "@/types/accountStorage";

export default function AccountDetails() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountStorage | null>(null);
  const [svmAccount, setSvmAccount] = useState<SVM_Account | null>(null);
  const [evmAccount, setEvmAccount] = useState<EVM_Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [showSVMPrivateKey, setShowSVMPrivateKey] = useState(false);
  const [showEVMPrivateKey, setShowEVMPrivateKey] = useState(false);

  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAccountData();
      return () => {}; // cleanup function
    }, [accountId]),
  );

  const loadAccountData = async () => {
    try {
      setLoading(true);

      if (!accountId) {
        router.back();
        return;
      }

      // Fetch account data and ensure we have the most recent version
      const accountData = await getAccountById(accountId);
      const svmData = await getSVMAccountById(accountId);
      const evmData = await getEVMAccountById(accountId);

      if (accountData) {
        setAccount(accountData);
        setNewAccountName(accountData.userAccountName);
      } else {
        // Handle case where account doesn't exist anymore
        Alert.alert(
          "Account Not Found",
          "This account may have been removed.",
          [{ text: "Go Back", onPress: () => router.back() }],
        );
        return;
      }

      setSvmAccount(svmData);
      setEvmAccount(evmData);
    } catch (error) {
      console.error("Error loading account data:", error);
      Alert.alert("Error", "Failed to load account details");
    } finally {
      setLoading(false);
    }
  };

  const handleRenameAccount = async () => {
    if (isEditing) {
      if (newAccountName.trim() === "") {
        Alert.alert("Error", "Account name cannot be empty");
        return;
      }

      try {
        // Update local state immediately for responsive UI
        if (account) {
          setAccount({
            ...account,
            userAccountName: newAccountName.trim(),
          });
        }

        await saveAccountName(accountId, newAccountName.trim());
        setIsEditing(false);

        // Force a complete reload of account data to refresh all related components
        await loadAccountData();
      } catch (error) {
        console.error("Error renaming account:", error);
        Alert.alert("Error", "Failed to rename account");

        // Revert to original name if save failed
        loadAccountData();
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleRemoveAccount = () => {
    Alert.alert(
      "Remove Account",
      `Are you sure you want to remove "${account?.userAccountName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectAccount(accountId);

              // Check if there are any remaining accounts
              const remainingAccounts = await getAllAccounts();

              if (remainingAccounts.length === 0) {
                // If no accounts left, go back to welcome screen
                router.replace("/");
              } else {
                // Otherwise go back to the authenticated route
                router.replace("/authenticated");
              }
            } catch (error) {
              console.error("Failed to remove account:", error);
              Alert.alert("Error", "Failed to remove account");
            }
          },
        },
      ],
    );
  };

  const showSeedPhraseConfirmation = () => {
    Alert.alert(
      "Security Warning",
      "Your seed phrase is the master key to your wallet. Never share it with anyone. Are you sure you want to reveal it?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Show Seed Phrase",
          onPress: () => setShowSeedPhrase(true),
        },
      ],
    );
  };

  const showSVMPrivateKeyConfirmation = () => {
    Alert.alert(
      "Security Warning",
      "Your private key provides full access to your wallet. Never share it with anyone. Are you sure you want to reveal it?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Show Private Key",
          onPress: () => setShowSVMPrivateKey(true),
        },
      ],
    );
  };

  const showEVMPrivateKeyConfirmation = () => {
    Alert.alert(
      "Security Warning",
      "Your private key provides full access to your wallet. Never share it with anyone. Are you sure you want to reveal it?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Show Private Key",
          onPress: () => setShowEVMPrivateKey(true),
        },
      ],
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", `${label} copied to clipboard`);
    } catch (error) {
      console.error("Failed to copy:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
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
            Account Details
          </Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Account Details
          </Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Account not found
          </Text>
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
          Account Details
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveAccount}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              General
            </Text>
          </View>

          <View style={styles.accountNameContainer}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>
              Account Name
            </Text>

            <View style={styles.accountNameInputRow}>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRenameAccount}
                />
              ) : (
                <Text style={[styles.accountName, { color: colors.text }]}>
                  {account.userAccountName}
                </Text>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleRenameAccount}>
                <Ionicons
                  name={isEditing ? "checkmark" : "pencil"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {(svmAccount?.seedPhrase || evmAccount?.seedPhrase) && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
            ]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Backup
              </Text>
            </View>

            <View style={styles.sensitiveDataContainer}>
              <View style={styles.dataRow}>
                <View>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Seed Phrase
                  </Text>
                  <Text
                    style={[
                      styles.fieldDescription,
                      { color: colors.tertiaryText },
                    ]}>
                    Your 12-word recovery phrase
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: showSeedPhrase
                        ? colors.error
                        : colors.primaryLight,
                    },
                  ]}
                  onPress={
                    showSeedPhrase
                      ? () => setShowSeedPhrase(false)
                      : showSeedPhraseConfirmation
                  }>
                  <Ionicons
                    name={showSeedPhrase ? "eye-off" : "eye"}
                    size={18}
                    color={showSeedPhrase ? "white" : colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {showSeedPhrase &&
                (svmAccount?.seedPhrase || evmAccount?.seedPhrase) && (
                  <View style={styles.sensitiveDataView}>
                    <View style={styles.seedPhraseContainer}>
                      {(
                        svmAccount?.seedPhrase ||
                        evmAccount?.seedPhrase ||
                        []
                      ).map((word, index) => (
                        <View
                          key={index}
                          style={[
                            styles.wordContainer,
                            {
                              backgroundColor:
                                theme === "dark"
                                  ? colors.inputBackground
                                  : "#F5F5F5",
                            },
                          ]}>
                          <Text
                            style={[
                              styles.wordIndex,
                              { color: colors.secondaryText },
                            ]}>
                            {index + 1}
                          </Text>
                          <Text style={[styles.word, { color: colors.text }]}>
                            {word}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.copyButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() =>
                        copyToClipboard(
                          (
                            svmAccount?.seedPhrase ||
                            evmAccount?.seedPhrase ||
                            []
                          ).join(" "),
                          "Seed phrase",
                        )
                      }>
                      <Ionicons name="copy-outline" size={18} color="white" />
                      <Text style={styles.copyButtonText}>
                        Copy to Clipboard
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          </View>
        )}

        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              SVM (Solana) Keys
            </Text>
          </View>

          {svmAccount ? (
            <>
              <View style={styles.keyRow}>
                <Text
                  style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                  Public Address
                </Text>
                <View style={styles.valueContainer}>
                  <Text style={[styles.publicKey, { color: colors.text }]}>
                    {svmAccount.publicKey.toString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyIconButton}
                    onPress={() =>
                      copyToClipboard(
                        svmAccount.publicKey.toString(),
                        "SVM public address",
                      )
                    }>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sensitiveDataContainer}>
                <View style={styles.dataRow}>
                  <View>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.secondaryText },
                      ]}>
                      Private Key
                    </Text>
                    <Text
                      style={[
                        styles.fieldDescription,
                        { color: colors.tertiaryText },
                      ]}>
                      Keep this secure
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: showSVMPrivateKey
                          ? colors.error
                          : colors.primaryLight,
                      },
                    ]}
                    onPress={
                      showSVMPrivateKey
                        ? () => setShowSVMPrivateKey(false)
                        : showSVMPrivateKeyConfirmation
                    }>
                    <Ionicons
                      name={showSVMPrivateKey ? "eye-off" : "eye"}
                      size={18}
                      color={showSVMPrivateKey ? "white" : colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {showSVMPrivateKey && (
                  <View style={styles.sensitiveDataView}>
                    <Text
                      style={[
                        styles.privateKeyText,
                        {
                          color: colors.text,
                          backgroundColor:
                            theme === "dark"
                              ? colors.inputBackground
                              : "#F5F5F5",
                        },
                      ]}>
                      {svmAccount.privateKey}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() =>
                        copyToClipboard(
                          svmAccount.privateKey,
                          "SVM private key",
                        )
                      }>
                      <Ionicons name="copy-outline" size={18} color="white" />
                      <Text style={styles.copyButtonText}>
                        Copy to Clipboard
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Text style={[styles.notAvailable, { color: colors.tertiaryText }]}>
              SVM account not available
            </Text>
          )}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              EVM (Ethereum) Keys
            </Text>
          </View>

          {evmAccount ? (
            <>
              <View style={styles.keyRow}>
                <Text
                  style={[styles.fieldLabel, { color: colors.secondaryText }]}>
                  Public Address
                </Text>
                <View style={styles.valueContainer}>
                  <Text style={[styles.publicKey, { color: colors.text }]}>
                    {evmAccount.publicKey}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyIconButton}
                    onPress={() =>
                      copyToClipboard(
                        evmAccount.publicKey,
                        "EVM public address",
                      )
                    }>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sensitiveDataContainer}>
                <View style={styles.dataRow}>
                  <View>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.secondaryText },
                      ]}>
                      Private Key
                    </Text>
                    <Text
                      style={[
                        styles.fieldDescription,
                        { color: colors.tertiaryText },
                      ]}>
                      Keep this secure
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: showEVMPrivateKey
                          ? colors.error
                          : colors.primaryLight,
                      },
                    ]}
                    onPress={
                      showEVMPrivateKey
                        ? () => setShowEVMPrivateKey(false)
                        : showEVMPrivateKeyConfirmation
                    }>
                    <Ionicons
                      name={showEVMPrivateKey ? "eye-off" : "eye"}
                      size={18}
                      color={showEVMPrivateKey ? "white" : colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {showEVMPrivateKey && (
                  <View style={styles.sensitiveDataView}>
                    <Text
                      style={[
                        styles.privateKeyText,
                        {
                          color: colors.text,
                          backgroundColor:
                            theme === "dark"
                              ? colors.inputBackground
                              : "#F5F5F5",
                        },
                      ]}>
                      {evmAccount.privateKey}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.copyButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() =>
                        copyToClipboard(
                          evmAccount.privateKey,
                          "EVM private key",
                        )
                      }>
                      <Ionicons name="copy-outline" size={18} color="white" />
                      <Text style={styles.copyButtonText}>
                        Copy to Clipboard
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Text style={[styles.notAvailable, { color: colors.tertiaryText }]}>
              EVM account not available
            </Text>
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
  removeButton: {
    padding: 8,
  },
  placeholderButton: {
    width: 36,
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
  accountNameContainer: {
    padding: 16,
    paddingVertical: 20,
  },
  accountNameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  sensitiveDataContainer: {
    padding: 16,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldDescription: {
    fontSize: 12,
  },
  sensitiveDataView: {
    marginTop: 16,
  },
  seedPhraseContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  wordIndex: {
    width: 24,
    fontSize: 12,
    fontWeight: "bold",
  },
  word: {
    fontSize: 14,
    fontWeight: "500",
  },
  privateKeyText: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "SpaceMono",
    marginBottom: 16,
    overflow: "hidden",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    padding: 12,
  },
  copyButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  keyRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  publicKey: {
    fontSize: 14,
    flex: 1,
    fontFamily: "SpaceMono",
  },
  copyIconButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
  },
  notAvailable: {
    padding: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
