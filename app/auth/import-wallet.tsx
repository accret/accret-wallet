import { useTheme } from "@/theme";
import { Text, View } from "react-native";

export default function ImportWallet() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}>
      <Text style={{ color: colors.text }}>Import Wallet</Text>
    </View>
  );
}
