// File: app/authenticated/dialect-blink/index.tsx
import React, { useEffect } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import ScreenHeader from "../ScreenHeader";

export default function DialectBlinkScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const actionUrl = params.url as string;

  useEffect(() => {
    if (actionUrl) {
      console.log("Processing Dialect Blink action URL:", actionUrl);
      // Here you would process the action URL
      // For example, make an API call to the actionUrl
    }
  }, [actionUrl]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Dialect Blink" />
      <ScrollView contentContainerStyle={styles.content}>
        {actionUrl ? (
          <>
            <Text style={[styles.titleText, { color: colors.text }]}>
              Solana Action
            </Text>
            <View style={[styles.urlCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.urlText, { color: colors.text }]}>
                {actionUrl}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: colors.secondaryText }]}>
              Processing this Solana action...
            </Text>
          </>
        ) : (
          <Text style={[styles.errorText, { color: colors.error }]}>
            No action URL provided
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  urlCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 16,
    fontFamily: "SpaceMono",
  },
  infoText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});
