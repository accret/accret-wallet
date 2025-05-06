import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";
import TokenItem from "./TokenItem";
import { TokenWithPrice } from "@/lib/api/portfolioUtils";
import {
  SolanaIcon,
  EthereumIcon,
  PolygonIcon,
  BaseIcon,
  ArbitrumIcon,
} from "@/icons";

interface ChainSectionProps {
  chainId: string;
  chainName: string;
  tokens: TokenWithPrice[];
  onTokenPress: (token: TokenWithPrice) => void;
}

export default function ChainSection({
  chainId,
  chainName,
  tokens,
  onTokenPress,
}: ChainSectionProps) {
  const { colors } = useTheme();

  // Calculate total value for this chain
  const totalChainValue = tokens.reduce(
    (sum, token) => sum + token.usdValue,
    0,
  );

  // Chain icon based on chainId
  const renderChainIcon = () => {
    const iconSize = 24;

    switch (chainId) {
      case "solana:101":
        return <SolanaIcon width={iconSize} height={iconSize} />;
      case "eip155:1":
        return <EthereumIcon width={iconSize} height={iconSize} />;
      case "eip155:137":
        return <PolygonIcon width={iconSize} height={iconSize} />;
      case "eip155:8453":
        return <BaseIcon width={iconSize} height={iconSize} />;
      case "eip155:42161":
        return <ArbitrumIcon width={iconSize} height={iconSize} />;
      default:
        return null;
    }
  };

  // Format chain total value
  const formatTotalValue = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  // If there are no tokens for this chain, don't render anything
  if (tokens.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.chainInfo}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primaryLight },
            ]}>
            {renderChainIcon()}
          </View>
          <Text style={[styles.chainName, { color: colors.text }]}>
            {chainName}
          </Text>
        </View>
        <Text style={[styles.totalValue, { color: colors.secondaryText }]}>
          {formatTotalValue(totalChainValue)}
        </Text>
      </View>

      {/* Sort tokens by USD value (highest first) */}
      {tokens
        .sort((a, b) => b.usdValue - a.usdValue)
        .map((token, index) => (
          <TokenItem
            key={`${token.data.chain.id}-${index}-${token.data.symbol}`}
            token={token}
            onPress={onTokenPress}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chainInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  chainName: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
