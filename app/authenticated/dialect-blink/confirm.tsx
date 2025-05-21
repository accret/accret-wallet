import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { getExplorerUrl } from "@/lib/tx/explorerUrl";
import { executeEncodedTx } from "@/lib/tx";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum One

export default function DialectBlinkConfirm() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const encodedTransaction = (params.encodedTx as string) || "";
  // const network = (params.network as ChainId) || "solana:101"; // Default to Solana mainnet
  const network = "solana:101";

  const [transactionHash, setTransactionHash] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [transactionStatus, setTransactionStatus] = useState<boolean>(false);

  useEffect(() => {
    const executeTransaction = async () => {
      try {
        setIsLoading(true);
        console.log("encodedTransaction", encodedTransaction);
        console.log("network", network);
        const result = await executeEncodedTx(encodedTransaction, network);
        setTransactionHash(result.hash);
        setTransactionStatus(result.status);
        setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setTransactionStatus(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (encodedTransaction) {
      executeTransaction();
    }
  }, [encodedTransaction, network]);

  const handleViewInExplorer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const explorerUrl = getExplorerUrl(network, transactionHash);
    Linking.openURL(explorerUrl).catch((err) => {
      console.error("Error opening explorer URL:", err);
    });
  };

  const handleClose = () => {
    router.push("/authenticated");
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Processing Transaction...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={[styles.title, { color: colors.text }]}>
          Transaction Details
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.successIconContainer}>
          <View
            style={[
              styles.successIconCircle,
              {
                backgroundColor: transactionStatus
                  ? colors.success + "20"
                  : colors.error + "20",
              },
            ]}>
            <Ionicons
              name={transactionStatus ? "checkmark-circle" : "close-circle"}
              size={80}
              color={transactionStatus ? colors.success : colors.error}
            />
          </View>
        </View>

        <Text style={[styles.successTitle, { color: colors.text }]}>
          {transactionStatus ? "Transaction Complete" : "Transaction Failed"}
        </Text>

        <Text style={[styles.successSubtitle, { color: colors.secondaryText }]}>
          {transactionStatus
            ? "Your transaction has been submitted and confirmed on the blockchain"
            : error || "Transaction could not be processed"}
        </Text>

        <View
          style={[styles.txInfoContainer, { backgroundColor: colors.card }]}>
          <View style={styles.txInfoRow}>
            <Text style={[styles.txInfoLabel, { color: colors.secondaryText }]}>
              Status
            </Text>
            <View style={styles.txStatusContainer}>
              <View
                style={[
                  styles.txStatusDot,
                  {
                    backgroundColor: transactionStatus
                      ? colors.success
                      : colors.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.txStatusText,
                  {
                    color: transactionStatus ? colors.success : colors.error,
                  },
                ]}>
                {transactionStatus ? "Confirmed" : "Failed"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.txInfoRow}>
            <Text style={[styles.txInfoLabel, { color: colors.secondaryText }]}>
              Transaction Hash
            </Text>
            <Text
              style={[styles.txHashText, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {transactionHash || "N/A"}
            </Text>
          </View>
        </View>

        {transactionHash && (
          <TouchableOpacity
            style={[styles.explorerButton, { borderColor: colors.border }]}
            onPress={handleViewInExplorer}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text
              style={[styles.explorerButtonText, { color: colors.primary }]}>
              View on Explorer
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={handleClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  successIconContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  txInfoContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  txInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  txInfoLabel: {
    fontSize: 15,
  },
  txStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  txStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  txStatusText: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  txHashText: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 180,
  },
  explorerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  explorerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
