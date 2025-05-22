import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useTheme } from "@/theme";
import {
  isBiometricsAvailable,
  getSupportedAuthTypes,
  setBiometricAuthEnabled,
  getBiometricAuthEnabled,
} from "@/lib/auth/biometricAuth";
import { Ionicons } from "@expo/vector-icons";

export default function SecuritySettingsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [supportedAuthTypes, setSupportedAuthTypes] = useState<string[]>([]);

  useEffect(() => {
    async function loadSettings() {
      try {
        // Check if biometrics is available on the device
        const available = await isBiometricsAvailable();
        setBiometricsAvailable(available);

        // Get currently supported auth types
        if (available) {
          const types = await getSupportedAuthTypes();
          setSupportedAuthTypes(types);
        }

        // Get user's biometric preference
        const enabled = await getBiometricAuthEnabled();
        setBiometricsEnabled(enabled);
      } catch (error) {
        console.error("Error loading security settings:", error);
        Alert.alert(
          "Error",
          "Failed to load security settings. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      await setBiometricAuthEnabled(value);
      setBiometricsEnabled(value);

      // Show confirmation to the user
      Alert.alert(
        "Settings Updated",
        `Biometric authentication has been ${value ? "enabled" : "disabled"}.`,
      );
    } catch (error) {
      console.error("Error toggling biometric authentication:", error);
      Alert.alert(
        "Error",
        "Failed to update biometric settings. Please try again.",
      );
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}>
      <Stack.Screen
        options={{
          title: "Security Settings",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Biometric Authentication
        </Text>

        {!biometricsAvailable ? (
          <View
            style={[
              styles.messageContainer,
              { backgroundColor: colors.primaryLight + "30" },
            ]}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={colors.error || colors.primary}
            />
            <Text style={[styles.messageText, { color: colors.secondaryText }]}>
              Biometric authentication is not available on this device. Please
              set up FaceID, TouchID, or fingerprint in your device settings.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {supportedAuthTypes.includes("facial")
                    ? "Use Face ID"
                    : "Use Fingerprint"}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.secondaryText },
                  ]}>
                  {`Require ${
                    supportedAuthTypes.includes("facial")
                      ? "Face ID"
                      : "fingerprint"
                  } to access your wallet and confirm transactions`}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{
                  false: colors.surface,
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          What is Protected
        </Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text style={[styles.bulletText, { color: colors.secondaryText }]}>
              Wallet access on app startup
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text style={[styles.bulletText, { color: colors.secondaryText }]}>
              Transaction confirmations
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  messageText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  bulletText: {
    marginLeft: 12,
    fontSize: 15,
  },
});
