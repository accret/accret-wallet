import React from "react";
import { useEffect } from "react";
import { useTheme } from "@/theme";
import { Stack } from "expo-router";
import { BackHandler, Platform } from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";

export default function AuthenticatedLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
        paddingTop: Platform.OS === "android" ? insets.top : 0,
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
        paddingLeft: Platform.OS === "android" ? insets.left : 0,
        paddingRight: Platform.OS === "android" ? insets.right : 0,
        backgroundColor: colors.background,
      }}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
