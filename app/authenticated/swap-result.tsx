import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SwapResultScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const fromToken = params.fromToken
    ? JSON.parse(params.fromToken as string)
    : null;
  const toToken = params.toToken ? JSON.parse(params.toToken as string) : null;
  const amount = params.amount as string;
  const estimatedAmount = params.estimatedAmount as string;
  const status = params.status as string;
  const quote = params.quote ? JSON.parse(params.quote as string) : null;

  const isSuccess = status === "success";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.contentContainer}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isSuccess
                ? colors.primary + "20"
                : colors.error + "20",
            },
          ]}>
          <Ionicons
            name={isSuccess ? "checkmark" : "close"}
            size={48}
            color={isSuccess ? colors.primary : colors.error}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {isSuccess ? "Swap Successful" : "Swap Failed"}
        </Text>
        <Text style={[styles.description, { color: colors.secondaryText }]}>
          {isSuccess
            ? `You swapped ${amount} ${fromToken?.symbol} for ~${estimatedAmount} ${toToken?.symbol}`
            : `There was an error while trying to swap ${amount} ${fromToken?.symbol}`}
        </Text>

        {/* Swap & Quote Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Route
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {quote?.route || "-"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Provider
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {quote?.provider || "-"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Market
            </Text>
            <Text
              style={[styles.summaryValue, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {quote?.market || "-"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Price
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              1 {fromToken?.symbol} ≈ {quote?.price} {toToken?.symbol}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Slippage
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {quote?.slippage}%
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.secondaryText }]}>
              Fees
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${quote?.fees?.toFixed(2) || "0.00"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/authenticated/(tabs)/portfolio")}>
          <Text style={styles.buttonText}>Back to Portfolio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentContainer: { alignItems: "center", padding: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: 320,
    maxWidth: "100%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 15 },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  button: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
