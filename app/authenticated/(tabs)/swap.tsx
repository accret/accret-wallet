import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../ScreenHeader";

export default function SwapScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Swap" />

      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}>
          <Ionicons name="swap-horizontal" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Swap & Bridge
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Swap tokens across chains and bridge assets seamlessly.
        </Text>
        <View
          style={[
            styles.comingSoonBanner,
            { backgroundColor: colors.primaryLight },
          ]}>
          <Text style={[styles.comingSoonText, { color: colors.primary }]}>
            Coming Soon
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: "80%",
  },
  comingSoonBanner: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
