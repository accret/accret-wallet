import axios, { AxiosResponse } from "axios";

interface Token {
  name: string;
  symbol: string;
  mint: string;
  contract: string;
  chainId: number;
  wChainId: number;
  decimals: number;
  logoURI: string;
  chain: string;
  balance?: string;
  value?: string;
}

interface SupportedTokens {
  [key: string]: Token[];
}

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export async function fetchSupportedTokens(
  chainId: ChainId,
): Promise<SupportedTokens> {
  try {
    // filter out tokens which name string contains "(Portal from"
    const filtterEnabled: boolean = true;

    let ChainName: string;

    switch (chainId) {
      case "solana:101":
        ChainName = "solana";
        break;
      case "eip155:1":
        ChainName = "ethereum";
        break;
      case "eip155:137":
        ChainName = "polygon";
        break;
      case "eip155:8453":
        ChainName = "base";
        break;
      case "eip155:42161":
        ChainName = "arbitrum";
        break;
    }

    const response: AxiosResponse<SupportedTokens> = await axios.get(
      `https://price-api.mayan.finance/v3/tokens?chain=${ChainName}`,
    );

    const supportedTokens: SupportedTokens = response.data;

    if (filtterEnabled) {
      for (const chain in supportedTokens) {
        supportedTokens[chain] = supportedTokens[chain].filter(
          (token) => !token.name.includes("(Portal from"),
        );
      }
    }

    return supportedTokens;
  } catch (error) {
    console.error("Error fetching supported tokens:", error);
    throw error;
  }
}
