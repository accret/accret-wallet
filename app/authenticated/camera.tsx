import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { StatusBar } from "expo-status-bar";

export default function ScanScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;

    const { data } = scanningResult;

    console.log("Scanned data:", data);

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Check if the data matches a Solana address pattern
      // Basic validation for Solana addresses: should start with a base58 character
      // and be between 32-44 characters long
      const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

      // Check if the data matches an Ethereum address pattern
      const ethAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/;

      // Additional check for URLs that might contain addresses
      const urlWithAddressRegex =
        /(?:solana:|ethereum:|[\/?&]address=)([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})/i;

      // Direct match for Solana address
      if (solanaAddressRegex.test(data)) {
        // Here you would navigate to send page with the address
        Alert.alert("Solana Address Found", `Scanned address: ${data}`, [
          {
            text: "Cancel",
            onPress: () => setScanned(false),
            style: "cancel",
          },
          {
            text: "Continue",
            onPress: () => {
              // Navigate to send page with the address
              // router.push({ pathname: "/authenticated/send", params: { recipientAddress: data } });
              setScanned(false);
              router.back();
            },
          },
        ]);
        return;
      }

      // Direct match for Ethereum address
      if (ethAddressRegex.test(data)) {
        Alert.alert("Ethereum Address Found", `Scanned address: ${data}`, [
          {
            text: "Cancel",
            onPress: () => setScanned(false),
            style: "cancel",
          },
          {
            text: "Continue",
            onPress: () => {
              // Navigate to send page with the address
              // router.push({ pathname: "/authenticated/send", params: { recipientAddress: data } });
              setScanned(false);
              router.back();
            },
          },
        ]);
        return;
      }

      // Check for address in URL format
      const urlMatch = data.match(urlWithAddressRegex);
      if (urlMatch && urlMatch[1]) {
        const address = urlMatch[1];
        const isSolana = solanaAddressRegex.test(address);
        const isEthereum = ethAddressRegex.test(address);

        Alert.alert(
          `${isSolana ? "Solana" : isEthereum ? "Ethereum" : "Wallet"} Address Found in URL`,
          `Extracted address: ${address}`,
          [
            {
              text: "Cancel",
              onPress: () => setScanned(false),
              style: "cancel",
            },
            {
              text: "Continue",
              onPress: () => {
                // Navigate to send page with the address
                // router.push({ pathname: "/authenticated/send", params: { recipientAddress: address } });
                setScanned(false);
                router.back();
              },
            },
          ],
        );
        return;
      }

      // If we got here, it's not a recognized format
      Alert.alert(
        "Invalid QR Code",
        "The scanned QR code does not contain a valid Solana or Ethereum wallet address.",
        [{ text: "OK", onPress: () => setScanned(false) }],
      );
    } catch (error) {
      console.log("Error processing QR code:", error);
      Alert.alert("Scan Error", "There was an error processing the QR code.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    }
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
        <Text style={[styles.title, { color: "#FFFFFF" }]}>Scan QR Code</Text>
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
                Scan a QR code containing a Solana or Ethereum wallet address
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
