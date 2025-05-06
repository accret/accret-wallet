import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { useTheme } from "@/theme";
import { TokenWithPrice } from "@/lib/api/portfolioUtils";
import { formatTokenAmount, formatUsdValue } from "@/lib/api/portfolioUtils";
import { TokenPlaceholderIcon } from "@/icons";

interface TokenItemProps {
  token: TokenWithPrice;
  onPress: (token: TokenWithPrice) => void;
}

export default function TokenItem({ token, onPress }: TokenItemProps) {
  const { colors } = useTheme();
  const formattedAmount = formatTokenAmount(
    token.data.amount,
    token.data.decimals,
  );

  // Determine if price change is positive, negative, or neutral
  const priceChangeColor =
    token.priceChange24h > 0
      ? colors.success
      : token.priceChange24h < 0
        ? colors.error
        : colors.tertiaryText;

  // Format price change as percentage with + or - sign
  const formattedPriceChange =
    token.priceChange24h > 0
      ? `+${token.priceChange24h.toFixed(2)}%`
      : token.priceChange24h < 0
        ? `${token.priceChange24h.toFixed(2)}%`
        : `0.00%`;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress(token)}>
      {/* Token Logo */}
      <View style={styles.logoContainer}>
        {token.data.logoUri ? (
          <Image
            source={{ uri: token.data.logoUri }}
            style={styles.tokenLogo}
            // Use the onError callback to show the placeholder if the image fails to load
            onError={() => {}}
          />
        ) : (
          <TokenPlaceholderIcon
            width={40}
            height={40}
            symbol={token.data.symbol}
          />
        )}
      </View>

      {/* Token Info */}
      <View style={styles.infoContainer}>
        <Text
          style={[styles.tokenName, { color: colors.text }]}
          numberOfLines={1}>
          {token.data.name}
        </Text>
        <Text style={[styles.tokenNetwork, { color: colors.secondaryText }]}>
          {token.data.chain.name}
        </Text>
      </View>

      {/* Token Amount */}
      <View style={styles.amountContainer}>
        <Text
          style={[styles.tokenAmount, { color: colors.text }]}
          numberOfLines={1}>
          {formattedAmount} {token.data.symbol}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.tokenValue, { color: colors.secondaryText }]}>
            {formatUsdValue(token.usdValue)}
          </Text>
          <Text style={[styles.priceChange, { color: priceChangeColor }]}>
            {formattedPriceChange}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  logoContainer: {
    marginRight: 12,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  tokenNetwork: {
    fontSize: 12,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  tokenAmount: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenValue: {
    fontSize: 12,
    marginRight: 6,
  },
  priceChange: {
    fontSize: 12,
    fontWeight: "500",
  },
});
