// lib/api/portfolioUtils.ts
import { Token } from "@/types/tokens";
import fetchTokens from "./tokens";
import fetchTokenPrice from "./tokenPrice";

// Define TokenWithPrice as a composite type rather than extending Token
export interface TokenWithPrice {
  type: Token["type"];
  data: Token["data"];
  usdValue: number;
  priceUsd: number;
  priceChange24h: number;
}

export interface PortfolioData {
  tokens: TokenWithPrice[];
  totalValueUsd: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date;
}

// Group tokens by chain
export function groupTokensByChain(
  tokens: TokenWithPrice[],
): Record<string, TokenWithPrice[]> {
  const grouped: Record<string, TokenWithPrice[]> = {};

  tokens.forEach((token) => {
    const chainId = token.data.chain.id;
    if (!grouped[chainId]) {
      grouped[chainId] = [];
    }
    grouped[chainId].push(token);
  });

  return grouped;
}

// Get a human-readable name for a chain ID
export function getChainName(chainId: string): string {
  const chainMap: Record<string, string> = {
    "solana:101": "Solana",
    "eip155:1": "Ethereum",
    "eip155:137": "Polygon",
    "eip155:8453": "Base",
    "eip155:42161": "Arbitrum",
  };

  return chainMap[chainId] || chainId;
}

// Convert token amount to human-readable format with proper decimal places
export function formatTokenAmount(amount: string, decimals: number): string {
  const bigIntAmount = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);

  if (bigIntAmount === BigInt(0)) return "0";

  const integer = bigIntAmount / divisor;
  const fraction = bigIntAmount % divisor;

  if (fraction === BigInt(0)) {
    return integer.toString();
  }

  let fractionStr = fraction.toString().padStart(decimals, "0");

  // Truncate to maximum 6 decimal places
  fractionStr = fractionStr.substring(0, 6);

  // Remove trailing zeros
  fractionStr = fractionStr.replace(/0+$/, "");

  return `${integer}.${fractionStr}`;
}

// Format USD value for display
export function formatUsdValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }

  // Format based on value size
  if (value >= 100) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value > 0) {
    return `$${value.toFixed(4)}`;
  }

  return "$0.00";
}

export async function fetchTokenPriceUsd(
  token: Token,
): Promise<{ price: number; priceChange24h: number }> {
  try {
    const chainId = token.data.chain.id as
      | "solana:101"
      | "eip155:1"
      | "eip155:137"
      | "eip155:8453"
      | "eip155:42161";

    let address = "";

    if (token.type === "ERC20") {
      // For ERC20 tokens, use the contract address
      const erc20Data = token.data as any; // Type assertion to avoid TypeScript errors
      address = erc20Data.contractAddress;
    } else if (token.type === "SPL") {
      // For SPL tokens, use the mint address
      const splData = token.data as any; // Type assertion to avoid TypeScript errors
      address = splData.mintAddress;
    } else {
      // For native tokens, use slip44 format
      const slip44Map: Record<string, string> = {
        "solana:101": "slip44:501",
        "eip155:1": "slip44:60",
        "eip155:137": "slip44:966",
        "eip155:8453": "slip44:8453",
        "eip155:42161": "slip44:9001",
      };
      address = slip44Map[chainId] || "";
    }

    if (!address) return { price: 0, priceChange24h: 0 };

    const priceData = await fetchTokenPrice(chainId, address);

    if ("price" in priceData) {
      return {
        price: priceData.price,
        priceChange24h: priceData.priceChange24h || 0,
      };
    }

    return { price: 0, priceChange24h: 0 };
  } catch (error) {
    console.error(
      `Error fetching price for token ${token.data.symbol}:`,
      error,
    );
    return { price: 0, priceChange24h: 0 };
  }
}

// Fetch all token data with prices
export async function fetchPortfolioData(): Promise<PortfolioData> {
  try {
    const tokensData = await fetchTokens();

    if (!tokensData.tokens || tokensData.tokens.length === 0) {
      return {
        tokens: [],
        totalValueUsd: 0,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      };
    }

    const tokensWithPrice: TokenWithPrice[] = await Promise.all(
      tokensData.tokens.map(async (token) => {
        const { price: priceUsd, priceChange24h } =
          await fetchTokenPriceUsd(token);
        const tokenAmount = formatTokenAmount(
          token.data.amount,
          token.data.decimals,
        );
        const usdValue = parseFloat(tokenAmount) * priceUsd;

        return {
          ...token,
          usdValue,
          priceUsd,
          priceChange24h,
        };
      }),
    );

    // Calculate total USD value
    const totalValueUsd = tokensWithPrice.reduce(
      (sum, token) => sum + token.usdValue,
      0,
    );

    return {
      tokens: tokensWithPrice,
      totalValueUsd,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    return {
      tokens: [],
      totalValueUsd: 0,
      isLoading: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch portfolio data",
      lastUpdated: new Date(),
    };
  }
}
