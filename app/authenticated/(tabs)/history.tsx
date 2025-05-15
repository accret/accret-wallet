import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { useTheme } from "@/theme";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getBridgeTxHistory, Datum } from "@/lib/api/bridgeTxHistory";

export default function HistoryScreen() {
  const { colors, theme } = useTheme();
  const [transactions, setTransactions] = useState<Datum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactionHistory = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const account = await getCurrentAccount();
      if (!account) {
        setError("No wallet account found");
        return;
      }

      const history = await getBridgeTxHistory({ account });
      setTransactions(history.data);
    } catch (error) {
      console.error("Error loading transaction history:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load transaction history",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load transaction history when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTransactionHistory();
      return () => {}; // cleanup function
    }, [fetchTransactionHistory]),
  );

  // Handle refresh
  const onRefresh = () => {
    fetchTransactionHistory(true);
  };

  // Open transaction in explorer
  const openTransactionInExplorer = (orderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://explorer.mayan.finance/tx/${orderId}`);
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Get appropriate status color and text
  const getStatusInfo = (status: string, clientStatus: string) => {
    let color = colors.secondaryText;
    let text = "Unknown";

    if (clientStatus === "COMPLETED") {
      color = colors.success;
      text = "Success";
    } else if (clientStatus === "INPROGRESS") {
      color = "#FF9800"; // Orange
      text = "Pending";
    } else if (status === "failed" || clientStatus === "FAILED") {
      color = colors.error;
      text = "Failed";
    } else if (status === "reverted" || clientStatus === "REVERTED") {
      color = colors.error;
      text = "Reverted";
    }

    return { color, text };
  };

  // Render status badge with color
  const renderStatusBadge = (status: string, clientStatus: string) => {
    const { color, text } = getStatusInfo(status, clientStatus);

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: color + "20" }, // 20% opacity
        ]}>
        <Text style={[styles.statusText, { color: color }]}>{text}</Text>
      </View>
    );
  };

  // Format amount to be more readable
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0";
    if (num < 0.0001) return num.toExponential(4);
    return num.toFixed(Math.min(6, amount.length));
  };

  // Render an individual transaction item
  const renderTransactionItem = ({ item }: { item: Datum }) => {
    const { color: statusColor } = getStatusInfo(
      item.status,
      item.clientStatus,
    );

    return (
      <TouchableOpacity
        style={[styles.transactionItem, { backgroundColor: colors.card }]}
        onPress={() => openTransactionInExplorer(item.orderId)}>
        <View style={styles.transactionHeader}>
          <View style={styles.tokensContainer}>
            <View style={styles.tokenContainer}>
              <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                {item.fromTokenSymbol}
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.secondaryText}
              />
            </View>
            <View style={styles.tokenContainer}>
              <Text style={[styles.tokenSymbol, { color: colors.text }]}>
                {item.toTokenSymbol}
              </Text>
            </View>
          </View>
          {renderStatusBadge(item.status, item.clientStatus)}
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatAmount(item.fromAmount)} {item.fromTokenSymbol} →{" "}
              {formatAmount(item.toAmount)} {item.toTokenSymbol}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
              Date
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(item.initiatedAt)}
            </Text>
          </View>

          {/* <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>
              Route
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {getChainDisplayName(item.sourceChain)} →{" "}
              {getChainDisplayName(item.destChain)}
            </Text>
          </View> */}
        </View>

        <View
          style={[
            styles.transactionFooter,
            {
              borderTopColor:
                theme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
            },
          ]}>
          <Text
            style={[styles.orderIdText, { color: colors.secondaryText }]}
            numberOfLines={1}
            ellipsizeMode="middle">
            ID: {item.orderId}
          </Text>
          <View style={styles.viewButton}>
            <Text style={[styles.viewButtonText, { color: statusColor }]}>
              View
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
  };

  // Render the screen content based on loading/error state
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.messageText, { color: colors.secondaryText }]}>
            Loading transaction history...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchTransactionHistory()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons
            name="time-outline"
            size={48}
            color={colors.secondaryText}
          />
          <Text style={[styles.messageText, { color: colors.secondaryText }]}>
            No transaction history found
          </Text>
          <Text style={[styles.subMessageText, { color: colors.tertiaryText }]}>
            Your cross-chain swaps will appear here
          </Text>
          <TouchableOpacity
            style={[
              styles.emptySwapButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() =>
              Linking.openURL("accret://authenticated/(tabs)/swap")
            }>
            <Text style={styles.emptySwapButtonText}>Make a Swap</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.orderId}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          History
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
          Your bridge transactions
        </Text>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  subMessageText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  emptySwapButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 24,
  },
  emptySwapButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    maxWidth: "80%",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  transactionItem: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  transactionHeader: {
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
  transactionDetails: {
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
  transactionFooter: {
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
