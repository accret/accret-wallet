import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { StatusBar } from "expo-status-bar";

// Define address regex patterns for chain detection
const ADDRESS_PATTERNS = {
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  ethereum: /^(0x)?[0-9a-fA-F]{40}$/,
};

export default function ScanScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  // Get the chainId from params (if provided)
  const chainId = params.chainId as string;

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;

    const { data } = scanningResult;

    console.log("Scanned data:", data);

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Check for Dialect Blink URLs
      const dialectBlinkRegex =
        /^https?:\/\/(dial\.to|dialto\.io|dialectlabs\.io|dialect\.to)/i;
      if (
        dialectBlinkRegex.test(data) ||
        data.includes("action=solana-action")
      ) {
        console.log("Detected Dialect Blink URL, navigating...");
        router.push({
          pathname: "/authenticated/dialect-blinks",
          params: { url: encodeURIComponent(data) },
        });
        return;
      }

      // If the scanned data contains a valid address
      let detectedAddress = extractAddress(data);
      let detectedChainId = detectChainFromAddress(detectedAddress || data);

      if (detectedAddress && detectedChainId) {
        // If we already have a chainId from params, check if it matches
        if (chainId && chainId !== detectedChainId) {
          // Chain mismatch warning
          Alert.alert(
            "Address Type Mismatch",
            `The scanned address is for ${getChainName(
              detectedChainId,
            )}, but you're trying to send from ${getChainName(chainId)}.`,
            [
              {
                text: "Cancel",
                onPress: () => setScanned(false),
                style: "cancel",
              },
              {
                text: "Continue Anyway",
                onPress: () => {
                  // Navigate to send page with the detected address but use the originally selected chain
                  router.push({
                    pathname: "/authenticated/send",
                    params: {
                      recipientAddress: detectedAddress,
                      chainId: chainId,
                    },
                  });
                },
              },
            ],
          );
          return;
        }

        // Navigate to send page with the address and detected chain
        router.push({
          pathname: "/authenticated/send",
          params: {
            recipientAddress: detectedAddress,
            chainId: detectedChainId,
          },
        });
        return;
      }

      // If no address is detected but a chainId is provided via params
      if (chainId) {
        // Ask if they want to use the scanned text as an address
        Alert.alert(
          "Use as Address?",
          `The scanned text doesn't look like a valid address. Do you want to use it as a ${getChainName(
            chainId,
          )} address?`,
          [
            {
              text: "Cancel",
              onPress: () => setScanned(false),
              style: "cancel",
            },
            {
              text: "Use as Address",
              onPress: () => {
                router.push({
                  pathname: "/authenticated/send",
                  params: {
                    recipientAddress: data,
                    chainId: chainId,
                  },
                });
              },
            },
          ],
        );
        return;
      }

      // If no address pattern is detected and no chainId provided
      Alert.alert(
        "Unknown QR Code",
        "The scanned QR code does not contain a recognized wallet address.",
        [{ text: "OK", onPress: () => setScanned(false) }],
      );
    } catch (error) {
      console.log("Error processing QR code:", error);
      Alert.alert("Scan Error", "There was an error processing the QR code.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    }
  };

  // Extract address from URL or plain text
  const extractAddress = (text: string): string | null => {
    // Check for URLs with addresses
    const urlWithAddressRegex =
      /(?:solana:|ethereum:|[\/?&]address=)([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})/i;
    const urlMatch = text.match(urlWithAddressRegex);

    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // No URL pattern found, treat as plain address
    return text;
  };

  // Detect which chain an address belongs to
  const detectChainFromAddress = (address: string): string | null => {
    // Check Solana address pattern
    if (ADDRESS_PATTERNS.solana.test(address)) {
      return "solana:101";
    }

    // Check Ethereum/EVM address pattern
    if (ADDRESS_PATTERNS.ethereum.test(address)) {
      // If we have a specific chainId from params, use that as the EVM chain
      if (chainId && chainId.startsWith("eip155:")) {
        return chainId;
      }

      // Default to Ethereum mainnet if no specific EVM chain is selected
      return "eip155:1";
    }

    return null;
  };

  // Get human-readable chain name
  const getChainName = (id: string): string => {
    const chainMap: Record<string, string> = {
      "solana:101": "Solana",
      "eip155:1": "Ethereum",
      "eip155:137": "Polygon",
      "eip155:8453": "Base",
      "eip155:42161": "Arbitrum",
    };

    return chainMap[id] || id;
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Scan QR Code
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.text, { color: colors.secondaryText }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Scan QR Code
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.text, { color: colors.secondaryText }]}>
            No access to camera. Please enable camera permissions to scan QR
            codes.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, marginTop: 12 },
            ]}
            onPress={() => router.back()}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: "#FFFFFF" }]}>
          Scan Address QR Code
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
          <View style={styles.overlay}>
            <View style={styles.scannerBoxContainer}>
              <View
                style={[styles.scannerBox, { borderColor: colors.primary }]}
              />
              <Text style={[styles.scannerText, { color: "#FFFFFF" }]}>
                {chainId
                  ? `Scan a ${getChainName(chainId)} address QR code`
                  : "Scan a wallet address QR code"}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {scanned && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scannerBoxContainer: {
    alignItems: "center",
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderRadius: 16,
    marginBottom: 16,
  },
  scannerText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  bottomContainer: {
    padding: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
