import React from "react";
import { useTheme } from "@/theme";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountLayout() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      edges={["left", "right"]}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}>
        <Stack.Screen
          name="account-details"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="account-settings"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
