import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

interface AddressValidationProps {
  address: string;
  chainName: string;
  isValid: boolean;
  isValidating?: boolean;
}

export default function AddressValidation({
  address,
  chainName,
  isValid,
  isValidating = false,
}: AddressValidationProps) {
  const { colors } = useTheme();
  const [shouldShow, setShouldShow] = useState(false);

  // Only show after address is non-empty and has stopped changing for a bit
  useEffect(() => {
    if (!address) {
      setShouldShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [address]);

  if (!address || !shouldShow) return null;

  return (
    <View style={styles.container}>
      {isValidating ? (
        <View style={styles.validatingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={[styles.validatingText, { color: colors.secondaryText }]}>
            Validating address...
          </Text>
        </View>
      ) : isValid ? (
        <View style={styles.validContainer}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.validText, { color: colors.success }]}>
            Valid {chainName} address
          </Text>
        </View>
      ) : (
        <View style={styles.invalidContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.invalidText, { color: colors.error }]}>
            Invalid {chainName} address format
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  validatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  validatingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  validContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  validText: {
    marginLeft: 8,
    fontSize: 14,
  },
  invalidContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  invalidText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
