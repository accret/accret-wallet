import "react-native-reanimated";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import { ThemeProvider } from "@/theme";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, Linking } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle deep linking
  useEffect(() => {
    // Function to handle dial.to URLs
    const handleDialectBlinkURL = (url: string) => {
      try {
        const parsedUrl = new URL(url);

        // Check if it's a dial.to URL
        if (parsedUrl.hostname === "dial.to") {
          // Extract the action parameter
          const action = parsedUrl.searchParams.get("action");

          if (action && action.startsWith("solana-action:")) {
            // Extract the actual action URL
            const actionUrl = action.substring("solana-action:".length);

            console.log("Extracted Solana action URL:", actionUrl);

            // Navigate to the Dialect Blink section with the action URL
            router.navigate({
              pathname: "/authenticated/dialect-blink",
              params: { url: actionUrl },
            });

            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("Error parsing URL:", error);
        return false;
      }
    };

    // Handle the initial URL that opened the app
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleDialectBlinkURL(url);
      }
    };

    // Set up a listener for URL events while the app is running
    const subscription = Linking.addEventListener("url", (event) => {
      handleDialectBlinkURL(event.url);
    });

    // Handle the initial URL
    handleInitialURL();

    // Clean up the subscription
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              gestureEnabled: false,
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="authenticated"
            options={{
              headerShown: false,
              gestureEnabled: false,
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
