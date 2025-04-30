import AccretLogo from "@/logo";
import { useState } from "react";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleCreateWallet = () => {
    if (agreeToTerms) {
      router.push("/auth/create-wallet");
    }
  };

  const handleImportWallet = () => {
    if (agreeToTerms) {
      router.push("/auth/import-wallet");
    }
  };

  const openTermsOfService = async () => {
    await WebBrowser.openBrowserAsync("https://api.accret.fun");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingBottom: 60,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 70,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: "center",
      marginBottom: 40,
    },
    termsContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: agreeToTerms ? colors.primary : colors.secondaryText,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      backgroundColor: agreeToTerms ? colors.primary : "transparent",
    },
    checkmark: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "bold",
    },
    termsText: {
      fontSize: 16,
      color: colors.text,
    },
    termsLink: {
      color: colors.primary,
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
      backgroundColor: agreeToTerms ? colors.primary : colors.disabledButton,
    },
    secondaryButton: {
      backgroundColor: "transparent",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: agreeToTerms ? "#FFFFFF" : colors.tertiaryText,
    },
    secondaryButtonText: {
      color: agreeToTerms ? colors.text : colors.tertiaryText,
    },
    footer: {
      position: "absolute",
      bottom: 10,
      width: 40,
      height: 5,
      backgroundColor: colors.border,
      borderRadius: 3,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <AccretLogo width={196} height={196} />
        <Text style={styles.title}>Welcome to Accret</Text>
        <Text style={styles.subtitle}>
          To get started, create a new wallet or import an existing one
        </Text>
      </View>

      <Pressable
        style={styles.termsContainer}
        onPress={() => setAgreeToTerms(!agreeToTerms)}>
        <View style={styles.checkbox}>
          {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          I agree to the{" "}
          <Text style={styles.termsLink} onPress={openTermsOfService}>
            Terms of Service
          </Text>
        </Text>
      </Pressable>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleCreateWallet}
        disabled={!agreeToTerms}>
        <Text style={styles.buttonText}>Create a new wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleImportWallet}
        disabled={!agreeToTerms}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Import existing wallet
        </Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </View>
  );
}
