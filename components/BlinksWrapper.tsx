import {
  Blink,
  BlockchainIds,
  createSignMessageText,
  useAction,
  type ActionAdapter,
  type SignMessageData,
} from "@dialectlabs/blinks-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { SVM_Account } from "@/types/accountStorage";

export interface BlinkWrapperProps {
  url: string;
  account: SVM_Account; // Replace with your account type
}

export const BlinkWrapper: React.FC<BlinkWrapperProps> = ({ url, account }) => {
  // Use a requestId to prevent duplicate API calls on re-renders
  // const requestIdRef = useRef(
  //   `blink-${Math.random().toString(36).substring(7)}`,
  // );
  const { colors } = useTheme();
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get the action data from the Dialect Blinks API
  const { action, isLoading: actionLoading } = useAction({ url });

  // // Log mount and unmount events (helpful for debugging)
  // useEffect(() => {
  //   console.log(
  //     `[Blink] Initialized with URL: ${url} [${requestIdRef.current}]`,
  //   );
  //   return () => console.log(`[Blink] Unmounted [${requestIdRef.current}]`);
  // }, [url]);

  // Create wallet adapter for Dialect Blinks
  const getWalletAdapter = (): ActionAdapter => {
    if (!account || !account.publicKey) {
      throw new Error("No wallet account available");
    }

    return {
      connect: async (_context) => {
        console.log("[Blink] Connecting wallet");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return account.publicKey.toString();
      },

      signTransaction: async (_tx, _context) => {
        console.log("[Blink] Signing transaction:", _tx);
        setTxHash(_tx);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return {
          signature: _tx,
        };
      },

      signMessage: async (message: string | SignMessageData, _context) => {
        console.log("[Blink] Signing message");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const messageToSign =
          typeof message === "string"
            ? message
            : createSignMessageText(message);
        console.log("[Blink] Message to sign:", messageToSign);
        return { signature: "signature" };
      },

      confirmTransaction: async (_signature, _context) => {
        console.log("[Blink] Confirming transaction:", _signature);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (_signature) {
          router.push({
            pathname: "/authenticated/dialect-blink/confirm",
            params: {
              transactionHash: txHash,
            },
          });
        }
      },

      metadata: {
        supportedBlockchainIds: [
          BlockchainIds.SOLANA_MAINNET,
          // BlockchainIds.SOLANA_DEVNET,
          // BlockchainIds.SOLANA_TESTNET,
        ],
      },
    };
  };

  if (actionLoading) {
    console.log("actionLoading", actionLoading);
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
          Loading Blink action...
        </Text>
      </View>
    );
  }

  if (!action) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Action Error
        </Text>
        <Text style={[styles.errorText, { color: colors.secondaryText }]}>
          {"Failed to load action details. Please try again."}
        </Text>
      </View>
    );
  }

  const actionUrl = new URL(url);
  const adapter = getWalletAdapter();

  return (
    <ScrollView style={{ paddingBottom: 100 }}>
      <View style={styles.blinkContainer}>
        <View style={styles.blinkWrapper}>
          <Blink
            action={action}
            adapter={adapter}
            websiteUrl={actionUrl.href}
            websiteText={actionUrl.hostname}
            theme={{
              "--blink-bg-primary": colors.card,
              "--blink-bg-secondary": colors.surface,
              "--blink-button": colors.primary,
              "--blink-button-disabled": colors.disabledButton || "#cccccc",
              "--blink-button-success": colors.success || "#4CAF50",
              "--blink-icon-error": colors.error || "#FF5252",
              "--blink-icon-primary": colors.primary,
              "--blink-icon-warning": colors.error || "#FF5252",
              "--blink-input-bg": colors.inputBackground || colors.surface,
              "--blink-input-bg-disabled": colors.disabledButton || "#cccccc",
              "--blink-input-bg-selected": colors.primaryLight || "#E3F2FD",
              "--blink-input-stroke": colors.border || "#E0E0E0",
              "--blink-input-stroke-disabled":
                colors.disabledButton || "#cccccc",
              "--blink-input-stroke-error": colors.error || "#FF5252",
              "--blink-input-stroke-selected": colors.primary,
              "--blink-stroke-error": colors.error || "#FF5252",
              "--blink-stroke-primary": colors.border || "#E0E0E0",
              "--blink-stroke-secondary": colors.border || "#E0E0E0",
              "--blink-stroke-warning": colors.error || "#FF5252",
              "--blink-text-brand": colors.primary,
              "--blink-text-button": "#FFFFFF",
              "--blink-text-button-disabled": colors.tertiaryText || "#9E9E9E",
              "--blink-text-button-success": colors.success || "#4CAF50",
              "--blink-text-error": colors.error || "#FF5252",
              "--blink-text-input": colors.text,
              "--blink-text-input-disabled": colors.tertiaryText || "#9E9E9E",
              "--blink-text-input-placeholder":
                colors.tertiaryText || "#9E9E9E",
              "--blink-text-link": colors.primary,
              "--blink-text-primary": colors.text,
              "--blink-text-secondary": colors.secondaryText || "#757575",
              "--blink-text-success": colors.success || "#4CAF50",
              "--blink-text-warning": colors.error || "#FF5252",
              "--blink-transparent-error": `${colors.error || "#FF5252"}20`,
              "--blink-transparent-grey": `${colors.tertiaryText || "#9E9E9E"}20`,
              "--blink-transparent-warning": `${colors.error || "#FF5252"}20`,
              "--blink-border-radius-rounded-lg": 8,
              "--blink-border-radius-rounded-xl": 12,
              "--blink-border-radius-rounded-2xl": 16,
              "--blink-border-radius-rounded-button": 12,
              "--blink-border-radius-rounded-input": 12,
              "--blink-border-radius-rounded-input-standalone": 12,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  blinkContainer: {
    flex: 1,
  },
  blinkWrapper: {
    flex: 1,
    paddingBottom: 20,
  },
});
