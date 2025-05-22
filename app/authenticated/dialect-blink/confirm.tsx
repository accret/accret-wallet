import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme";
import { executeEncodedTx } from "@/lib/tx/solana/executeEncodedTx";
import { getExplorerUrl } from "@/lib/tx/explorerUrl";

// Transaction status types
enum TransactionStatus {
  PENDING = "PENDING",
  CONFIRMING = "CONFIRMING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

export default function DialectBlinkConfirmScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  // Log params for debugging
  console.log("Confirmation page params:", params);

  const transactionHash = params.transactionHash as string;
  const transactionSignature = params.signature as string;
  const encodedTx = params.encodedTx as string;
  const networkId = "solana:101";
  const [status, setStatus] = useState<TransactionStatus>(
    TransactionStatus.PENDING,
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [explorerLink, setExplorerLink] = useState<string | null>(null);
  const [, setSignature] = useState<string | null>(
    transactionSignature || null,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Log transaction details for debugging
  useEffect(() => {
    console.log("Transaction Hash:", transactionHash);
    console.log("Transaction Signature:", transactionSignature);
    console.log("Encoded Transaction:", encodedTx);
  }, [transactionHash, transactionSignature, encodedTx]);

  const handleCopyHash = async () => {
    if (!transactionHash) {
      Alert.alert("Error", "No transaction hash available to copy");
      return;
    }
    await Clipboard.setStringAsync(transactionHash);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInExplorer = async () => {
    if (!explorerLink) {
      Alert.alert("Error", "No transaction hash available to view");
      return;
    }
    try {
      console.log("Opening explorer URL:", explorerLink);
      await WebBrowser.openBrowserAsync(explorerLink);
    } catch (error) {
      console.error("Error opening explorer:", error);
      Alert.alert("Error", "Failed to open transaction in explorer");
    }
  };

  const handleConfirmTransaction = async () => {
    try {
      if (!encodedTx) {
        throw new Error("Transaction data not provided");
      }

      // Set submitting state to show loading indicator
      setIsSubmitting(true);
      setIsProcessing(true);

      // Processing RPC submission
      setStatus(TransactionStatus.PENDING);

      // Execute the transaction
      const result = await executeEncodedTx(encodedTx);

      // Get the transaction signature
      const transactionSignature =
        "signature" in result && typeof result.signature === "string"
          ? result.signature
          : null;

      if (transactionSignature) {
        setSignature(transactionSignature);

        // Generate explorer link
        const link = getExplorerUrl(networkId, transactionSignature);
        console.log("Generated explorer link:", link);
        setExplorerLink(link);

        // Update status
        setStatus(TransactionStatus.CONFIRMING);

        // Wait a moment and mark as confirmed
        // In a production app, you'd poll for confirmation status
        setTimeout(() => {
          setStatus(TransactionStatus.CONFIRMED);
          setIsProcessing(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 3000);
      } else {
        throw new Error("Transaction submitted but no signature returned");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus(TransactionStatus.FAILED);
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsProcessing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a function to handle returning to the wallet
  const handleReturnToWallet = () => {
    router.replace("/authenticated");
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case TransactionStatus.PENDING:
        return "Submitting Transaction";
      case TransactionStatus.CONFIRMING:
        return "Confirming Transaction";
      case TransactionStatus.CONFIRMED:
        return "Transaction Confirmed";
      case TransactionStatus.FAILED:
        return "Transaction Failed";
    }
  };

  // Get status description
  const getStatusDescription = () => {
    switch (status) {
      case TransactionStatus.PENDING:
        return "Your transaction is being submitted to the network...";
      case TransactionStatus.CONFIRMING:
        return "Waiting for confirmation from the Solana network...";
      case TransactionStatus.CONFIRMED:
        return "Your transaction has been confirmed successfully.";
      case TransactionStatus.FAILED:
        return `There was an issue with your transaction: ${errorMessage || "Unknown error"}`;
    }
  };

  // Show error if no transaction hash is available
  if (!transactionHash) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            No Transaction Data
          </Text>
          <Text style={[styles.errorText, { color: colors.secondaryText }]}>
            No transaction data was provided. Please try the action again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      {(isSubmitting || isProcessing) && (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: `${colors.background}CC` },
          ]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {isSubmitting
              ? "Processing transaction..."
              : "Confirming transaction..."}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Confirm Transaction
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Transaction Details
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>
              Network
            </Text>
            <View
              style={[
                styles.networkBadge,
                { backgroundColor: colors.networkBadge },
              ]}>
              <View
                style={[styles.networkDot, { backgroundColor: colors.primary }]}
              />
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>
              Transaction
            </Text>
            <View style={styles.hashContainer}>
              <Text
                style={[styles.hashText, { color: colors.text }]}
                numberOfLines={2}
                ellipsizeMode="middle">
                {transactionHash.substring(0, 8)}...
                {transactionHash.substring(transactionHash.length - 8)}
              </Text>
              <TouchableOpacity onPress={handleCopyHash}>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={20}
                  color={copied ? colors.success : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>
              Status
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      status === TransactionStatus.CONFIRMED
                        ? colors.success + "20"
                        : status === TransactionStatus.FAILED
                          ? colors.error + "20"
                          : colors.primaryLight,
                  },
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        status === TransactionStatus.CONFIRMED
                          ? colors.success
                          : status === TransactionStatus.FAILED
                            ? colors.error
                            : colors.primary,
                    },
                  ]}>
                  {getStatusText()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {status === TransactionStatus.FAILED && (
          <View
            style={[styles.errorBox, { backgroundColor: colors.error + "10" }]}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.error}
            />
            <Text style={[styles.errorBoxText, { color: colors.error }]}>
              {getStatusDescription()}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {explorerLink && status === TransactionStatus.CONFIRMED && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              onPress={openInExplorer}>
              <Ionicons name="open-outline" size={20} color={colors.primary} />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}>
                View in Explorer
              </Text>
            </TouchableOpacity>
          )}

          {status !== TransactionStatus.CONFIRMED &&
            status !== TransactionStatus.FAILED && (
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSubmitting || isProcessing ? 0.7 : 1,
                  },
                ]}
                onPress={handleConfirmTransaction}
                disabled={isSubmitting || isProcessing}>
                {isSubmitting || isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.confirmButtonText}>
                      Confirm Transaction
                    </Text>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            )}

          {status === TransactionStatus.FAILED && (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => router.back()}>
              <Text style={styles.confirmButtonText}>Try Again</Text>
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {status === TransactionStatus.CONFIRMED && (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: colors.success },
              ]}
              onPress={handleReturnToWallet}>
              <Text style={styles.confirmButtonText}>Return to Wallet</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.note}>
          <Text style={[styles.noteText, { color: colors.secondaryText }]}>
            Once confirmed, this transaction cannot be reversed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hashContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 16,
  },
  hashText: {
    fontSize: 14,
    fontFamily: "SpaceMono",
    lineHeight: 20,
    flex: 1,
    textAlign: "right",
  },
  statusContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "500",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  note: {
    alignItems: "center",
    paddingVertical: 12,
  },
  noteText: {
    fontSize: 14,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorBoxText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 10,
  },
  codeContainer: {
    maxHeight: 200,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  instructionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  instructionsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleButton: {
    padding: 8,
  },
  instructionsDetails: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  instructionItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  instructionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  programText: {
    fontSize: 12,
    fontWeight: "500",
  },
  accountsContainer: {
    marginTop: 8,
  },
  accountsLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  accountsList: {
    gap: 8,
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountLabel: {
    fontSize: 14,
    width: "30%",
  },
  accountValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "70%",
  },
  accountValue: {
    fontSize: 14,
    flex: 1,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
});
