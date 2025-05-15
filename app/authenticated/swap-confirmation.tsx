import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SwapConfirmationScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const fromToken = params.fromToken
    ? JSON.parse(params.fromToken as string)
    : null;
  const toToken = params.toToken ? JSON.parse(params.toToken as string) : null;
  const amount = params.amount as string;
  const estimatedAmount = params.estimatedAmount as string;
  const quote = params.quote ? JSON.parse(params.quote as string) : null;

  const [pricingModalVisible, setPricingModalVisible] = useState(false);

  const handleConfirm = () => {
    // Navigate to execution page (placeholder)
    router.push({
      pathname: "/authenticated/swap-result",
      params: {
        fromToken: JSON.stringify(fromToken),
        toToken: JSON.stringify(toToken),
        amount,
        estimatedAmount,
        quote: JSON.stringify(quote),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Confirm Swap
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          From
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {" "}
          {fromToken ? fromToken.symbol : "-"} (
          {fromToken ? fromToken.chain : "-"}){" "}
        </Text>
        <Text style={[styles.label, { color: colors.secondaryText }]}>To</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {" "}
          {toToken ? toToken.symbol : "-"} ({toToken ? toToken.chain : "-"}
          ){" "}
        </Text>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          Amount
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>{amount}</Text>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          Estimated Received
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {estimatedAmount}
        </Text>

        {/* Quote Summary Card */}
        {quote && (
          <View
            style={[
              styles.quoteCard,
              { backgroundColor: theme === "dark" ? colors.card : "#181A20" },
            ]}>
            <TouchableOpacity
              style={styles.quoteRow}
              onPress={() => setPricingModalVisible(true)}>
              <Text
                style={[styles.quoteLabel, { color: colors.secondaryText }]}>
                Pricing{" "}
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.secondaryText}
                />
              </Text>
              <Text style={[styles.quoteValue, { color: colors.text }]}>
                1 {fromToken?.symbol} ≈ {quote.price} {toToken?.symbol}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.secondaryText}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
            <View style={styles.quoteRow}>
              <Text
                style={[styles.quoteLabel, { color: colors.secondaryText }]}>
                Slippage{" "}
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.secondaryText}
                />
              </Text>
              <Text style={[styles.quoteValue, { color: colors.text }]}>
                {quote.slippage}%
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text
                style={[styles.quoteLabel, { color: colors.secondaryText }]}>
                Price Impact{" "}
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.secondaryText}
                />
              </Text>
              <Text style={[styles.quoteValue, { color: colors.text }]}>
                {quote.priceImpact}%
              </Text>
            </View>
            <View style={styles.quoteRow}>
              <Text
                style={[styles.quoteLabel, { color: colors.secondaryText }]}>
                Fees{" "}
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={colors.secondaryText}
                />
              </Text>
              <Text style={[styles.quoteValue, { color: colors.text }]}>
                ${quote.fees.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm Swap</Text>
        </TouchableOpacity>
      </View>

      {/* Pricing Details Modal */}
      <Modal
        visible={pricingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPricingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme === "dark" ? colors.card : "#fff" },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Pricing{" "}
                <Ionicons name="flash" size={16} color={colors.primary} />
              </Text>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalRow}>
              <Text
                style={[styles.modalLabel, { color: colors.secondaryText }]}>
                Provider
              </Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>
                {quote?.provider}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text
                style={[styles.modalLabel, { color: colors.secondaryText }]}>
                Market
              </Text>
              <Text
                style={[styles.modalValue, { color: colors.text, flex: 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {quote?.market}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text
                style={[styles.modalLabel, { color: colors.secondaryText }]}>
                Price
              </Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>
                1 {fromToken?.symbol} ≈ {quote?.price} {toToken?.symbol}
              </Text>
            </View>
            <Text
              style={[
                styles.modalDescription,
                { color: colors.secondaryText },
              ]}>
              The default setting will automatically select the provider
              offering the most favorable conversion rate given pricing and fees
              and quotes will refresh periodically.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  backButton: { padding: 8 },
  headerRightPlaceholder: { width: 40 },
  contentContainer: { padding: 24 },
  label: { fontSize: 14, marginTop: 16 },
  value: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  buttonContainer: { padding: 16 },
  confirmButton: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  quoteCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  quoteLabel: {
    fontSize: 15,
  },
  quoteValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalLabel: { fontSize: 15 },
  modalValue: { fontSize: 15, fontWeight: "600" },
  modalDescription: { fontSize: 13, marginTop: 16 },
});
