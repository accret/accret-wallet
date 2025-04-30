import { useTheme } from "@/theme";
import { Text, View } from "react-native";

export default function Index() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}>
      <Text style={{ color: colors.text }}>Accret Wallet</Text>
    </View>
  );
}
