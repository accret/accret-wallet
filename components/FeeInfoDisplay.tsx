import React from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { TransactionFeeInfo } from "@/lib/tx";

interface FeeInfoDisplayProps {
  feeInfo: TransactionFeeInfo | null;
  isLoading: boolean;
  chainId: string;
  error: string | null;
}

export default function FeeInfoDisplay({
  feeInfo,
  isLoading,
  chainId,
  error,
}: FeeInfoDisplayProps) {
  const { colors, theme } = useTheme();

  // Check if fee info is for EVM chains
  const isEVMFee = feeInfo && "gasLimit" in feeInfo;
  // Check if fee info is for Solana
  const isSolanaFee = feeInfo && "hasSufficientSol" in feeInfo;

  // Determine if user has sufficient balance
  const hasSufficientBalance = isEVMFee
    ? feeInfo?.hasSufficientBalance
    : isSolanaFee
      ? feeInfo?.hasSufficientSol
      : false;

  // Get fee currency symbol based on chain
  const getFeeCurrency = () => {
    if (chainId === "solana:101") return "SOL";
    return "ETH"; // Default for all EVM chains
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
        ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Estimating transaction fee...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
        ]}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.error}
          />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (!feeInfo) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
      ]}>
      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.secondaryText }]}>
          Estimated Network Fee:
        </Text>
        <Text style={[styles.feeValue, { color: colors.text }]}>
          {feeInfo.estimatedFee} {getFeeCurrency()}
        </Text>
      </View>

      {isEVMFee && (
        <View style={styles.feeRow}>
          <Text style={[styles.feeLabel, { color: colors.secondaryText }]}>
            Gas Limit:
          </Text>
          <Text style={[styles.feeValue, { color: colors.text }]}>
            {feeInfo.gasLimit}
          </Text>
        </View>
      )}

      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.secondaryText }]}>
          Your Balance:
        </Text>
        <Text style={[styles.feeValue, { color: colors.text }]}>
          {isEVMFee
            ? `${feeInfo.currentBalance} ${getFeeCurrency()}`
            : isSolanaFee
              ? `${feeInfo.currentSolBalance} ${getFeeCurrency()}`
              : "Unknown"}
        </Text>
      </View>

      <View
        style={[
          styles.statusContainer,
          {
            backgroundColor: hasSufficientBalance
              ? colors.success + "20"
              : colors.error + "20",
          },
        ]}>
        <Ionicons
          name={hasSufficientBalance ? "checkmark-circle" : "alert-circle"}
          size={16}
          color={hasSufficientBalance ? colors.success : colors.error}
        />
        <Text
          style={[
            styles.statusText,
            { color: hasSufficientBalance ? colors.success : colors.error },
          ]}>
          {hasSufficientBalance
            ? "You have sufficient balance for the network fee"
            : `Insufficient balance for the network fee. You need at least ${feeInfo.estimatedFee} ${getFeeCurrency()}.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
});
