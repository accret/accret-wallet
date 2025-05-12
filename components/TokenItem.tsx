// File: accret-wallet/components/TokenItem.tsx (updated)
import React, { useState } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { useTheme } from "@/theme";
import { TokenWithPrice } from "@/lib/api/portfolioUtils";
import { formatTokenAmount, formatUsdValue } from "@/lib/api/portfolioUtils";
import { TokenPlaceholderIcon } from "@/icons";
import { useRouter } from "expo-router";

interface TokenItemProps {
  token: TokenWithPrice;
  onPress?: (token: TokenWithPrice) => void;
}

export default function TokenItem({ token, onPress }: TokenItemProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
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

  // Handle Polygon logo URL specifically
  const getLogoUri = () => {
    // Check if it's the problematic Polygon URL
    if (
      token.data.logoUri ===
      "https://wallet-asset.matic.network/img/tokens/matic.svg"
    ) {
      return "https://dhc7eusqrdwa0.cloudfront.net/assets/polygon.png";
    }
    return token.data.logoUri;
  };

  const handlePress = () => {
    let tokenAddress = "";

    if (token.type === "ERC20") {
      // For ERC20 tokens, use the contract address
      const erc20Data = token.data as any;
      tokenAddress = erc20Data.contractAddress;
    } else if (token.type === "SPL") {
      // For SPL tokens, use the mint address
      const splData = token.data as any;
      tokenAddress = splData.mintAddress;
    } else {
      // For native tokens, use slip44 format
      const slip44Map: Record<string, string> = {
        "solana:101": "slip44:501",
        "eip155:1": "slip44:60",
        "eip155:137": "slip44:966",
        "eip155:8453": "slip44:8453",
        "eip155:42161": "slip44:9001",
      };
      tokenAddress = slip44Map[token.data.chain.id] || "";
    }

    router.push({
      pathname: "/authenticated/token-detail",
      params: {
        network: token.data.chain.id,
        tokenAddress: tokenAddress,
        name: token.data.name,
        symbol: token.data.symbol,
        logo: token.data.logoUri,
        amount: token.data.amount,
        decimals: token.data.decimals.toString(),
        price: token.priceUsd.toString(),
        priceChange: token.priceChange24h.toString(),
        value: token.usdValue.toString(),
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={handlePress}>
      {/* Token Logo */}
      <View style={styles.logoContainer}>
        {token.data.logoUri && !imageError ? (
          <Image
            source={{ uri: getLogoUri() }}
            style={styles.tokenLogo}
            onError={() => setImageError(true)}
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
        {/* TODO: Display token name instead of chain name */}
        <Text style={[styles.tokenNetwork, { color: colors.secondaryText }]}>
          {token.data.symbol}
        </Text>
      </View>

      {/* Token Amount */}
      <View style={styles.amountContainer}>
        <Text
          style={[styles.tokenAmount, { color: colors.text }]}
          numberOfLines={1}>
          {formattedAmount}
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
