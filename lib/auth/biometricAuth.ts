import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// Key for storing biometric authentication preference
const BIOMETRIC_AUTH_ENABLED_KEY = "biometricAuthEnabled";

// Types of authentication
export type AuthenticationType = "login" | "transaction";

// Authentication result type
export type AuthResult = {
  success: boolean;
  error?: string;
  canceled: boolean;
};

/**
 * Check if biometric authentication is available on the device
 * @returns Promise resolving to boolean indicating if biometric authentication is available
 */
export const isBiometricsAvailable = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error("Error checking biometrics availability:", error);
    return false;
  }
};

/**
 * Get the supported authentication types (fingerprint, facial recognition)
 * @returns Promise resolving to array of authentication types
 */
export const getSupportedAuthTypes = async (): Promise<string[]> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const typeNames = types.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return "fingerprint";
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return "facial";
        default:
          return "unknown";
      }
    });
    return typeNames;
  } catch (error) {
    console.error("Error getting supported authentication types:", error);
    return [];
  }
};

/**
 * Authenticate the user using biometrics with detailed result
 * @param type The type of authentication (login or transaction)
 * @returns Promise resolving to AuthResult object with success, error and canceled properties
 */
export const authenticateWithBiometricsDetailed = async (
  type: AuthenticationType,
): Promise<AuthResult> => {
  try {
    // Check if biometric auth is enabled by user
    const isEnabled = await getBiometricAuthEnabled();
    if (!isEnabled) {
      return { success: true, canceled: false }; // If biometrics is disabled, allow access
    }

    // Check if device supports biometrics
    const isAvailable = await isBiometricsAvailable();
    if (!isAvailable) {
      console.warn("Biometric authentication is not available on this device");
      return { success: true, canceled: false }; // Allow access if not available
    }

    // Customize message based on authentication type
    const promptMessage =
      type === "login"
        ? "Authenticate to access your wallet"
        : "Authenticate to confirm transaction";

    // Authenticate user
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: "Use Passcode",
    });

    if (result.success) {
      return { success: true, canceled: false };
    } else if (result.error === "user_cancel") {
      return {
        success: false,
        canceled: true,
        error: "Authentication was canceled",
      };
    } else {
      return {
        success: false,
        canceled: false,
        error: result.error || "Authentication failed",
      };
    }
  } catch (error) {
    console.error("Error during biometric authentication:", error);
    return {
      success: false,
      canceled: false,
      error:
        error instanceof Error ? error.message : "Unknown authentication error",
    };
  }
};

/**
 * Authenticate the user using biometrics (simplified version)
 * @param type The type of authentication (login or transaction)
 * @returns Promise resolving to boolean indicating if authentication was successful
 */
export const authenticateWithBiometrics = async (
  type: AuthenticationType,
): Promise<boolean> => {
  const result = await authenticateWithBiometricsDetailed(type);
  return result.success;
};

/**
 * Set biometric authentication preference
 * @param enabled Boolean indicating if biometric authentication should be enabled
 */
export const setBiometricAuthEnabled = async (
  enabled: boolean,
): Promise<void> => {
  try {
    await SecureStore.setItemAsync(
      BIOMETRIC_AUTH_ENABLED_KEY,
      JSON.stringify(enabled),
    );
  } catch (error) {
    console.error("Error setting biometric authentication preference:", error);
    throw error;
  }
};

/**
 * Get biometric authentication preference
 * @returns Promise resolving to boolean indicating if biometric authentication is enabled
 */
export const getBiometricAuthEnabled = async (): Promise<boolean> => {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_AUTH_ENABLED_KEY);
    // Default to true if not set
    if (value === null) return true;
    return JSON.parse(value);
  } catch (error) {
    console.error("Error getting biometric authentication preference:", error);
    return true; // Default to enabled if there's an error
  }
};
