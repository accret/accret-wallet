import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
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
import SuccessAnimation from "@/components/SuccessAnimation";

export default function DialectBlinkConfirmScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const encodedTx = params.encodedTx as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Ref to track component mount status and cleanup timeouts
  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sendTx = async () => {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setIsSuccess(null);
      setErrorMessage(null);
      setTxHash(null);
      setExplorerUrl(null);

      try {
        const result = await executeEncodedTx(encodedTx);

        // Check if component is still mounted before updating state
        if (!isMountedRef.current) return;

        // Safe type checking instead of unsafe assertions
        if (result && typeof result === "object" && "signature" in result) {
          const signature = (result as any).signature;
          if (typeof signature === "string") {
            setTxHash(signature);
            setExplorerUrl(getExplorerUrl("solana:101", signature));
            setIsSuccess(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setIsSuccess(false);
            setErrorMessage("Invalid transaction signature format");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } else {
          setIsSuccess(false);
          setErrorMessage("No transaction signature returned");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (err: unknown) {
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) return;

        setIsSuccess(false);
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred";
        setErrorMessage(errorMsg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        // Check if component is still mounted before updating state
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    if (encodedTx) {
      sendTx();
    }
  }, [encodedTx]);

  const handleCopyHash = async () => {
    if (!txHash || !isMountedRef.current) return;

    try {
      await Clipboard.setStringAsync(txHash);

      if (!isMountedRef.current) return;

      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Set new timeout with proper cleanup
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopied(false);
        }
      }, 2000);
    } catch (error) {
      console.error("Failed to copy hash:", error);
      if (isMountedRef.current) {
        Alert.alert("Error", "Failed to copy transaction hash");
      }
    }
  };

  const handleViewInExplorer = async () => {
    if (!explorerUrl) return;

    try {
      await WebBrowser.openBrowserAsync(explorerUrl);
    } catch (error) {
      console.error("Failed to open explorer:", error);
      Alert.alert("Error", "Failed to open explorer");
    }
  };

  const handleReturn = () => {
    router.replace("/authenticated");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleReturn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Transaction Result
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        style={styles.scrollContainer}>
        <View style={styles.resultIconContainer}>
          {isLoading ? (
            <ActivityIndicator size={80} color={colors.primary} />
          ) : isSuccess ? (
            <SuccessAnimation size={80} />
          ) : (
            <View
              style={[
                styles.errorIconCircle,
                { backgroundColor: colors.error + "20" },
              ]}>
              <Ionicons name="close" size={48} color={colors.error} />
            </View>
          )}
        </View>

        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {isLoading
            ? "Processing Transaction..."
            : isSuccess
              ? "Transaction Successful"
              : "Transaction Failed"}
        </Text>

        <Text
          style={[styles.resultDescription, { color: colors.secondaryText }]}>
          {isLoading
            ? "Your transaction is being submitted to the network..."
            : isSuccess
              ? "Your transaction has been confirmed on Solana Mainnet."
              : `There was an error while trying to send your transaction${errorMessage ? ": " + errorMessage : ""}`}
        </Text>

        {txHash && !isLoading && (
          <View style={styles.hashContainer}>
            <Text style={[styles.hashLabel, { color: colors.secondaryText }]}>
              Transaction Hash
            </Text>
            <View style={styles.hashRow}>
              <Text
                style={[styles.hashText, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="middle">
                {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 8)}
              </Text>
              <TouchableOpacity
                onPress={handleCopyHash}
                style={styles.copyButton}>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={20}
                  color={copied ? colors.success : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {explorerUrl && !isLoading && (
          <TouchableOpacity
            style={[
              styles.viewExplorerButton,
              { backgroundColor: colors.primaryLight },
            ]}
            onPress={handleViewInExplorer}>
            <Text
              style={[
                styles.viewExplorerButtonText,
                { color: colors.primary },
              ]}>
              View in Explorer
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {!isLoading && !isSuccess && errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.error}
            />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {!isLoading && (
          <TouchableOpacity
            style={[styles.returnButton, { backgroundColor: colors.primary }]}
            onPress={handleReturn}>
            <Text style={styles.returnButtonText}>Return to Wallet</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  resultIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 48,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  resultDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  hashContainer: {
    marginBottom: 16,
    alignItems: "center",
    width: "100%",
  },
  hashLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  hashRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hashText: {
    fontSize: 14,
    fontFamily: "SpaceMono",
    lineHeight: 20,
    textAlign: "right",
    maxWidth: 180,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  viewExplorerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  viewExplorerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
  },
  returnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2E85FE",
    marginTop: 8,
    width: "100%",
  },
  returnButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});
