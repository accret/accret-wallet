// File: app/authenticated/dialect-blink/index.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme";
import ScreenHeader from "../ScreenHeader";
import { SVM_Account } from "@/types/accountStorage";
import { getCurrentAccount } from "@/lib/accountStorage";
import { BlinkWrapper } from "@/components/BlinksWrapper";
import { Ionicons } from "@expo/vector-icons";

export default function DialectBlinkScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const actionUrl = params.url as string;

  const url = actionUrl ? decodeURIComponent(actionUrl) : "No URL provided";

  console.log("Dialect Blink View - Decoded URL:", url);

  const [account, setAccount] = useState<SVM_Account>();

  useEffect(() => {
    async function init() {
      const acc = await getCurrentAccount();
      if (!acc) {
        console.log("No account found");
        return;
      }

      setAccount(acc.svm as SVM_Account);
    }
    init();
  }, []);

  const handleBack = () => {
    router.replace("/authenticated");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Dialect Blink"
        leftAction={{
          icon: "chevron-back",
          onPress: handleBack,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {actionUrl ? (
          <View style={styles.content}>
            {account && url !== "No URL provided" ? (
              <BlinkWrapper url={url} account={account} />
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.error}
                />
                <Text style={[styles.errorText, { color: colors.text }]}>
                  No valid Blink URL provided. Please go back and try again.
                </Text>
              </View>
            )}
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
