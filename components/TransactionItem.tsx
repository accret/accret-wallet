import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import {
  Datum,
  formatTransactionDate,
  formatTokenAmount,
  getNormalizedStatus,
  calculateUsdValue,
  isCrossChainTransaction,
} from "@/lib/api/bridgeTxHistory";

interface TransactionItemProps {
  transaction: Datum;
  onPress: (transaction: Datum) => void;
}

export default function TransactionItem({
  transaction,
  onPress,
}: TransactionItemProps) {
  const { colors, theme } = useTheme();
  const status = getNormalizedStatus(transaction);

  // Determine status color and text
  let statusColor = colors.secondaryText;
  let statusText = "Unknown";

  switch (status) {
    case "success":
      statusColor = colors.success;
      statusText = "Success";
      break;
    case "pending":
      statusColor = "#FF9800"; // Orange
      statusText = "Pending";
      break;
    case "failed":
    case "reverted":
      statusColor = colors.error;
      statusText = status === "failed" ? "Failed" : "Reverted";
      break;
  }

  // Determine if transaction is cross-chain
  const crossChain = isCrossChainTransaction(transaction);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress(transaction)}>
      <View style={styles.header}>
        <View style={styles.tokensContainer}>
          <View style={styles.tokenContainer}>
            <Text style={[styles.tokenSymbol, { color: colors.text }]}>
              {transaction.fromTokenSymbol}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons
              name={crossChain ? "git-branch-outline" : "arrow-forward"}
              size={16}
              color={colors.secondaryText}
            />
          </View>
          <View style={styles.tokenContainer}>
            <Text style={[styles.tokenSymbol, { color: colors.text }]}>
              {transaction.toTokenSymbol}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "20" }, // 20% opacity
          ]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        {/* Amount row */}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
            Amount
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatTokenAmount(transaction.fromAmount)}{" "}
            {transaction.fromTokenSymbol} →{" "}
            {formatTokenAmount(transaction.toAmount)}{" "}
            {transaction.toTokenSymbol}
          </Text>
        </View>

        {/* USD Value row (if price info is available) */}
        {transaction.fromTokenPrice > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
              Value
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {calculateUsdValue(
                transaction.fromAmount,
                transaction.fromTokenPrice,
              )}
              {" → "}
              {calculateUsdValue(
                transaction.toAmount,
                transaction.toTokenPrice,
              )}
            </Text>
          </View>
        )}

        {/* Date row */}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
            Date
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatTransactionDate(transaction.initiatedAt)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            borderTopColor:
              theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          },
        ]}>
        <Text
          style={[styles.orderIdText, { color: colors.secondaryText }]}
          numberOfLines={1}
          ellipsizeMode="middle">
          ID: {transaction.orderId}
        </Text>
        <View style={styles.viewButton}>
          <Text style={[styles.viewButtonText, { color: statusColor }]}>
            View Details
          </Text>
          <Ionicons
            name="open-outline"
            size={14}
            color={statusColor}
            style={styles.viewIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tokensContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },
  arrowContainer: {
    marginHorizontal: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  details: {
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "65%",
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  orderIdText: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewIcon: {
    marginLeft: 4,
  },
});
