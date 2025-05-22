import React, { useEffect, useState, useCallback } from "react";
import { AccretIcon } from "@/icons";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { getAllAccountsInfo, getCurrentAccountId } from "@/lib/accountStorage";
import { authenticateWithBiometricsDetailed } from "@/lib/auth/biometricAuth";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  // Define checkExistingWallets with useCallback to avoid dependency issues
  const checkExistingWallets = useCallback(async () => {
    try {
      // Get current account ID
      const currentId = await getCurrentAccountId();

      // If there's a current account, attempt biometric authentication
      if (currentId) {
        const accounts = await getAllAccountsInfo();
        if (accounts.length > 0) {
          setLoading(false);
          setAuthenticating(true);

          // Perform biometric authentication with detailed result
          const authResult = await authenticateWithBiometricsDetailed("login");

          if (authResult.success) {
            // Authentication successful, navigate to authenticated route
            router.replace("/authenticated");
          } else if (authResult.canceled) {
            // User canceled the authentication, stay on welcome screen
            setAuthenticating(false);
            // No need to show an alert for cancellation
          } else {
            // Authentication failed for other reasons
            setAuthenticating(false);
            Alert.alert(
              "Authentication Failed",
              authResult.error ||
                "Please try again or use another method to access your wallet.",
              [{ text: "OK" }],
            );
          }
          return;
        }
      }

      // Otherwise, check if there are any accounts without requiring authentication
      const accounts = await getAllAccountsInfo();
      if (accounts.length > 0) {
        router.replace("/authenticated");
        return;
      }

      // No wallets exist, show the welcome screen
      setLoading(false);
    } catch (error) {
      console.error("Error checking wallets:", error);
      setLoading(false);
    }
  }, [router]);

  // Check for existing wallets on mount
  useEffect(() => {
    checkExistingWallets();
  }, [checkExistingWallets]);

  const handleCreateWallet = () => {
    router.push("/auth/create-wallet");
  };

  const handleImportWallet = () => {
    router.push("/auth/import-wallet");
  };

  const openTermsOfUse = async () => {
    // Replace with your actual terms of use URL
    await WebBrowser.openBrowserAsync("https://api.accret.fun");
  };

  const openPrivacyPolicy = async () => {
    // Replace with your actual privacy policy URL
    await WebBrowser.openBrowserAsync("https://api.accret.fun");
  };

  // Show loading state while checking for wallets
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show loading state while authenticating
  if (authenticating) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center" },
        ]}>
        <AccretIcon width={120} height={120} />
        <Text style={[styles.authText, { color: colors.text, marginTop: 20 }]}>
          Authenticating...
        </Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <AccretIcon width={196} height={196} />
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome to Accret
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          To get started, create a new {"\n"} wallet or import an existing one
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleCreateWallet}>
            <Text style={styles.buttonText}>Create a new wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleImportWallet}>
            <Text
              style={[
                styles.buttonText,
                styles.secondaryButtonText,
                { color: colors.text },
              ]}>
              Import existing wallet
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.termsText, { color: colors.secondaryText }]}>
            By continuing, you agree to our{"\n"}
            <Text
              style={[styles.termsLink, { color: colors.text }]}
              onPress={openTermsOfUse}>
              Terms of Use
            </Text>{" "}
            and{" "}
            <Text
              style={[styles.termsLink, { color: colors.text }]}
              onPress={openPrivacyPolicy}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    alignItems: "center",
    width: "100%",
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  authText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 20,
  },
  buttonsContainer: {
    width: "100%",
    paddingHorizontal: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButton: {
    // backgroundColor is set dynamically
  },
  secondaryButton: {
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    // color is set dynamically
  },
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  termsText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: "600",
  },
});
