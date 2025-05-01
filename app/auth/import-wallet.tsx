import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as bip39 from "bip39";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  connectSVMAccountWithSeedPhrase,
  connectEVMAccountWithSeedPhrase,
  connectSVMAccountWithPrivateKey,
  connectEVMAccountWithPrivateKey,
  generateAccountName,
} from "@/lib/accountStorage";

enum ImportMethod {
  SEED_PHRASE = "SEED_PHRASE",
  PRIVATE_KEY = "PRIVATE_KEY",
}

enum KeyType {
  SVM = "SVM",
  EVM = "EVM",
  UNKNOWN = "UNKNOWN",
}

export default function ImportWallet() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [importMethod, setImportMethod] = useState<ImportMethod>(
    ImportMethod.SEED_PHRASE,
  );
  const [seedPhrase, setSeedPhrase] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [detectedKeyType, setDetectedKeyType] = useState<KeyType>(
    KeyType.UNKNOWN,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isValidInput, setIsValidInput] = useState(false);

  // Validate input when it changes
  useEffect(() => {
    validateInput();
  }, [seedPhrase, privateKey, importMethod]);

  // Function to validate the current input and detect key type
  const validateInput = () => {
    if (importMethod === ImportMethod.SEED_PHRASE) {
      // Check if the seed phrase is valid (12, 15, 18, 21, or 24 words)
      const words = seedPhrase.trim().split(/\s+/);
      const validWordCounts = [12, 15, 18, 21, 24];
      const isValidWordCount = validWordCounts.includes(words.length);

      // Validate with bip39
      const isValid =
        isValidWordCount && bip39.validateMnemonic(seedPhrase.trim());
      setIsValidInput(isValid);
    } else if (importMethod === ImportMethod.PRIVATE_KEY) {
      // Auto-detect key type from format
      const cleanKey = privateKey.trim();

      // SVM private keys are base58 encoded and typically 43-88 characters
      const isSVMKey = /^[1-9A-HJ-NP-Za-km-z]{43,88}$/.test(cleanKey);

      // EVM private keys are hex strings of 64 characters (with or without 0x prefix)
      const normalizedEVMKey = cleanKey.startsWith("0x")
        ? cleanKey.slice(2)
        : cleanKey;
      const isEVMKey = /^[0-9a-fA-F]{64}$/.test(normalizedEVMKey);

      if (isSVMKey) {
        setDetectedKeyType(KeyType.SVM);
        setIsValidInput(true);
      } else if (isEVMKey) {
        setDetectedKeyType(KeyType.EVM);
        setIsValidInput(true);
      } else {
        setDetectedKeyType(KeyType.UNKNOWN);
        setIsValidInput(false);
      }
    }
  };

  // Handle pasting from clipboard
  const handlePaste = async (target: "seedPhrase" | "privateKey") => {
    try {
      const clipboardText = await Clipboard.getStringAsync();

      if (!clipboardText) {
        Alert.alert(
          "Empty Clipboard",
          "There's nothing to paste from your clipboard.",
        );
        return;
      }

      if (target === "seedPhrase") {
        setSeedPhrase(clipboardText);
      } else {
        setPrivateKey(clipboardText);
      }
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      Alert.alert("Error", "Failed to paste from clipboard.");
    }
  };

  // Handle importing wallet
  const handleImportWallet = async () => {
    if (!isValidInput) {
      Alert.alert("Error", "Please enter a valid input before continuing.");
      return;
    }

    try {
      setIsLoading(true);

      // Generate a unique account ID using timestamp
      const userAccountID = `wallet_${Date.now()}`;

      // Generate a sequential account name (Account 1, Account 2, etc.)
      const userAccountName = await generateAccountName();

      if (importMethod === ImportMethod.SEED_PHRASE) {
        // Import wallet using seed phrase
        const seedPhraseArray = seedPhrase.trim().split(/\s+/);

        // Create SVM (Solana) wallet
        await connectSVMAccountWithSeedPhrase(
          userAccountID,
          userAccountName,
          seedPhraseArray,
        );

        // Create EVM (Ethereum) wallet with the same seed phrase
        await connectEVMAccountWithSeedPhrase(
          userAccountID,
          userAccountName,
          seedPhraseArray,
        );

        // Navigate to the authenticated route
        router.replace("/authenticated");
      } else {
        // Import wallet using private key based on detected type
        if (detectedKeyType === KeyType.SVM) {
          // Import SVM wallet with private key
          await connectSVMAccountWithPrivateKey(
            userAccountID,
            userAccountName,
            privateKey.trim(),
          );
        } else if (detectedKeyType === KeyType.EVM) {
          // Import EVM wallet with private key
          const normalizedKey = privateKey.trim().startsWith("0x")
            ? privateKey.trim()
            : `0x${privateKey.trim()}`;

          await connectEVMAccountWithPrivateKey(
            userAccountID,
            userAccountName,
            normalizedKey,
          );
        } else {
          throw new Error(
            "Unable to detect key type. Please check your input.",
          );
        }

        // Navigate to the authenticated route
        router.replace("/authenticated");
      }
    } catch (error) {
      console.error("Error importing wallet:", error);
      Alert.alert(
        "Error",
        "Failed to import wallet. Please check your input and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 0 : 12,
      height: 50,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    placeholderButton: {
      width: 40,
    },
    scrollContainer: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 100,
    },
    methodSelector: {
      flexDirection: "row",
      backgroundColor:
        theme === "dark" ? colors.inputBackground : colors.surface,
      borderRadius: 28,
      marginBottom: 24,
      padding: 4,
    },
    methodOption: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 24,
    },
    activeMethodOption: {
      // backgroundColor is set dynamically
    },
    methodOptionText: {
      fontWeight: "600",
    },
    activeMethodOptionText: {
      color: "#FFFFFF",
    },
    inputSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    warningBox: {
      backgroundColor:
        theme === "dark" ? "rgba(255, 59, 48, 0.15)" : "rgba(255, 59, 48, 0.1)",
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 8,
      color: colors.error,
    },
    warningText: {
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      color: colors.error,
    },
    inputContainer: {
      position: "relative",
      marginBottom: 8,
    },
    multilineInput: {
      borderRadius: 12,
      padding: 16,
      paddingRight: 56, // Make room for paste button
      minHeight: 120,
      textAlignVertical: "top",
      fontFamily: "SpaceMono",
    },
    pasteButton: {
      position: "absolute",
      right: 12,
      bottom: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    validIndicator: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
    },
    validText: {
      marginLeft: 4,
      fontSize: 14,
    },
    buttonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      backgroundColor: "transparent",
    },
    continueButton: {
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Import Wallet
          </Text>
          <View style={styles.placeholderButton} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {/* Method selector */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[
                styles.methodOption,
                importMethod === ImportMethod.SEED_PHRASE && [
                  styles.activeMethodOption,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => setImportMethod(ImportMethod.SEED_PHRASE)}>
              <Text
                style={[
                  styles.methodOptionText,
                  importMethod === ImportMethod.SEED_PHRASE &&
                    styles.activeMethodOptionText,
                  {
                    color:
                      importMethod === ImportMethod.SEED_PHRASE
                        ? "white"
                        : colors.text,
                  },
                ]}>
                Seed Phrase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodOption,
                importMethod === ImportMethod.PRIVATE_KEY && [
                  styles.activeMethodOption,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => setImportMethod(ImportMethod.PRIVATE_KEY)}>
              <Text
                style={[
                  styles.methodOptionText,
                  importMethod === ImportMethod.PRIVATE_KEY &&
                    styles.activeMethodOptionText,
                  {
                    color:
                      importMethod === ImportMethod.PRIVATE_KEY
                        ? "white"
                        : colors.text,
                  },
                ]}>
                Private Key
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seed Phrase Input */}
          {importMethod === ImportMethod.SEED_PHRASE && (
            <View style={styles.inputSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Enter Your Recovery Phrase
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: colors.secondaryText },
                ]}>
                Enter your 12, 15, 18, 21, or 24-word seed phrase separated by
                spaces.
              </Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Security Warning</Text>
                <Text style={styles.warningText}>
                  Never share your seed phrase with anyone. Anyone with this
                  phrase can access your funds.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.multilineInput,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? colors.inputBackground
                          : colors.surface,
                      color: colors.text,
                      borderColor: isValidInput
                        ? colors.success
                        : colors.border,
                      borderWidth: isValidInput ? 1 : 0,
                    },
                  ]}
                  placeholder="Enter your seed phrase here..."
                  placeholderTextColor={colors.tertiaryText}
                  value={seedPhrase}
                  onChangeText={setSeedPhrase}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
                <TouchableOpacity
                  style={[
                    styles.pasteButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handlePaste("seedPhrase")}>
                  <Ionicons name="clipboard-outline" size={18} color="white" />
                </TouchableOpacity>
              </View>

              {isValidInput && (
                <View style={styles.validIndicator}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={[styles.validText, { color: colors.success }]}>
                    Valid seed phrase
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Private Key Input */}
          {importMethod === ImportMethod.PRIVATE_KEY && (
            <View style={styles.inputSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Enter Your Private Key
              </Text>

              <Text
                style={[
                  styles.sectionDescription,
                  { color: colors.secondaryText },
                ]}>
                Enter your private key. We'll automatically detect if it's a
                Solana (SVM) or Ethereum (EVM) key.
              </Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Security Warning</Text>
                <Text style={styles.warningText}>
                  Never share your private key with anyone. Anyone with this key
                  can access your funds.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.multilineInput,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? colors.inputBackground
                          : colors.surface,
                      color: colors.text,
                      borderColor: isValidInput
                        ? colors.success
                        : colors.border,
                      borderWidth: isValidInput ? 1 : 0,
                    },
                  ]}
                  placeholder="Enter your private key here..."
                  placeholderTextColor={colors.tertiaryText}
                  value={privateKey}
                  onChangeText={setPrivateKey}
                  multiline
                  numberOfLines={2}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
                <TouchableOpacity
                  style={[
                    styles.pasteButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handlePaste("privateKey")}>
                  <Ionicons name="clipboard-outline" size={18} color="white" />
                </TouchableOpacity>
              </View>

              {isValidInput && detectedKeyType !== KeyType.UNKNOWN && (
                <View style={styles.validIndicator}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={[styles.validText, { color: colors.success }]}>
                    Valid{" "}
                    {detectedKeyType === KeyType.SVM ? "Solana" : "Ethereum"}{" "}
                    private key detected
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Continue button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isValidInput
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.disabledButton },
            ]}
            onPress={handleImportWallet}
            disabled={!isValidInput || isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.continueButtonText}>Import Wallet</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
