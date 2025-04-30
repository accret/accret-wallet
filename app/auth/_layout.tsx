import React from "react";
import { useTheme } from "@/theme";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";

export default function AuthLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === "android" ? insets.top : 0,
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
        paddingLeft: Platform.OS === "android" ? insets.left : 0,
        paddingRight: Platform.OS === "android" ? insets.right : 0,
        backgroundColor: colors.background,
      }}>
      <Stack>
        <Stack.Screen
          name="create-wallet"
          options={{
            headerShown: false,
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="import-wallet"
          options={{
            headerShown: false,
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
