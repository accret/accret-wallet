import AccretLogo from "@/logo";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      backgroundColor: colors.background,
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
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 18,
      lineHeight: 24,
      color: colors.secondaryText,
      textAlign: "center",
      marginBottom: 40,
      paddingHorizontal: 10,
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
      backgroundColor: colors.primary,
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
      color: colors.text,
    },
    footer: {
      width: "100%",
      alignItems: "center",
      marginBottom: 20,
    },
    termsText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.secondaryText,
      textAlign: "center",
    },
    termsLink: {
      color: colors.text,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <AccretLogo width={196} height={196} />
        <Text style={styles.title}>Welcome to Accret</Text>
        <Text style={styles.subtitle}>
          To get started, create a new {"\n"} wallet or import an existing one
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateWallet}>
            <Text style={styles.buttonText}>Create a new wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleImportWallet}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Import existing wallet
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{"\n"}
            <Text style={styles.termsLink} onPress={openTermsOfUse}>
              Terms of Use
            </Text>{" "}
            and{" "}
            <Text style={styles.termsLink} onPress={openPrivacyPolicy}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}
