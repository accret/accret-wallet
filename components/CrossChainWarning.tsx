import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

interface CrossChainWarningProps {
  detectedChain: string;
  selectedChain: string;
  onDismiss: () => void;
  onSwitch: () => void;
}

export default function CrossChainWarning({
  detectedChain,
  selectedChain,
  onDismiss,
  onSwitch,
}: CrossChainWarningProps) {
  const { colors } = useTheme();

  // Format chain name for display
  const formatChainName = (chainId: string): string => {
    const chainMap: Record<string, string> = {
      "solana:101": "Solana",
      "eip155:1": "Ethereum",
      "eip155:137": "Polygon",
      "eip155:8453": "Base",
      "eip155:42161": "Arbitrum",
    };

    return chainMap[chainId] || chainId;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.error + "20", borderColor: colors.error },
      ]}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={24} color={colors.error} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.error }]}>
          Possible address mismatch
        </Text>
        <Text style={[styles.message, { color: colors.text }]}>
          This address appears to be for{" "}
          <Text style={{ fontWeight: "bold" }}>
            {formatChainName(detectedChain)}
          </Text>{" "}
          but you're sending from{" "}
          <Text style={{ fontWeight: "bold" }}>
            {formatChainName(selectedChain)}
          </Text>
          .
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.dismissButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={onDismiss}>
            <Text style={[styles.dismissButtonText, { color: colors.text }]}>
              Keep Current Chain
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchButton, { backgroundColor: colors.primary }]}
            onPress={onSwitch}>
            <Text style={styles.switchButtonText}>
              Switch to {formatChainName(detectedChain)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
