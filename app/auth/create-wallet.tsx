import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as bip39 from "bip39";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  connectSVMAccountWithSeedPhrase,
  connectEVMAccountWithSeedPhrase,
} from "@/lib/accountStorage";

export default function CreateWallet() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Generate seed phrase on first render
  useEffect(() => {
    generateNewSeedPhrase();
  }, []);

  // Function to generate a new seed phrase
  const generateNewSeedPhrase = () => {
    const mnemonic = bip39.generateMnemonic();
    setSeedPhrase(mnemonic.split(" "));
  };

  // Copy seed phrase to clipboard
  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(seedPhrase.join(" "));
      Alert.alert("Copied", "Seed phrase copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  // Show confirmation alert with native UI
  const handleContinue = () => {
    Alert.alert(
      "Have You Saved Your Seed Phrase?",
      "This phrase is your only recovery key. Have you saved it securely?",
      [
        {
          text: "View Again",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: createWallet,
        },
      ],
    );
  };

  // Create wallet with the generated seed phrase
  const createWallet = async () => {
    try {
      setIsCreating(true);

      // Generate a unique account ID using timestamp
      const userAccountID = `wallet_${Date.now()}`;
      const userAccountName = "My Wallet"; // Default name

      // Create SVM (Solana) wallet
      await connectSVMAccountWithSeedPhrase(
        userAccountID,
        userAccountName,
        seedPhrase,
      );

      // Create EVM (Ethereum) wallet with the same seed phrase
      await connectEVMAccountWithSeedPhrase(
        userAccountID,
        userAccountName,
        seedPhrase,
      );

      // Navigate to the authenticated route
      router.replace("/authenticated");
    } catch (error) {
      console.error("Error creating wallet:", error);
      Alert.alert("Error", "Failed to create wallet. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Seed Phrase
        </Text>
        <View style={styles.emptySpace} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Warning box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>
            Do not share your secret phrase!
          </Text>
          <Text style={styles.warningText}>
            Your seed phrase is the master key to your wallet. Write it down and
            keep it in a secure location. Never share it with anyone!
          </Text>
        </View>

        {/* Seed phrase section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Seed Phrase
        </Text>

        {/* Words grid */}
        <View style={styles.gridContainer}>
          <View style={styles.column}>
            {seedPhrase.slice(0, 6).map((word, index) => (
              <View
                key={index}
                style={[
                  styles.wordContainer,
                  { backgroundColor: theme === "dark" ? "#2A2A2A" : "#F1F1F1" },
                ]}>
                <Text
                  style={[styles.wordIndex, { color: colors.secondaryText }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.word, { color: colors.text }]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.column}>
            {seedPhrase.slice(6, 12).map((word, index) => (
              <View
                key={index + 6}
                style={[
                  styles.wordContainer,
                  { backgroundColor: theme === "dark" ? "#2A2A2A" : "#F1F1F1" },
                ]}>
                <Text
                  style={[styles.wordIndex, { color: colors.secondaryText }]}>
                  {index + 7}
                </Text>
                <Text style={[styles.word, { color: colors.text }]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme === "dark" ? "#2A2A2A" : "#F1F1F1" },
          ]}
          onPress={copyToClipboard}>
          <Ionicons
            name="copy-outline"
            size={20}
            color={colors.text}
            style={styles.buttonIcon}
          />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            Copy to Clipboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme === "dark" ? "#2A2A2A" : "#F1F1F1" },
          ]}
          onPress={generateNewSeedPhrase}>
          <Ionicons
            name="refresh"
            size={20}
            color={colors.text}
            style={styles.buttonIcon}
          />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            Generate New Phrase
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          disabled={isCreating}>
          <Text style={styles.continueButtonText}>
            {isCreating ? "Creating..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
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
  emptySpace: {
    width: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  warningBox: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#FF3B30",
  },
  warningText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    color: "#FF3B30",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  column: {
    width: "48%",
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  wordIndex: {
    marginRight: 8,
    width: 20,
    fontSize: 16,
  },
  word: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
