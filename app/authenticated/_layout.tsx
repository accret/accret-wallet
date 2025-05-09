import React from "react";
import { useEffect } from "react";
import { useTheme } from "@/theme";
import { Stack } from "expo-router";
import { BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthenticatedLayout() {
  const { colors } = useTheme();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      edges={["top", "left", "right", "bottom"]}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            gestureEnabled: true,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="receive"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="token-detail"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="send"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
