import axios, { AxiosResponse } from "axios";
import type { TokenInfoResponse } from "@/types/tokenInfo";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export default async function fetchTokenPrice(
  network: ChainId,
  tokenAddress: string,
): Promise<TokenInfoResponse> {
  try {
    const body = {
      network,
      tokenAddress,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    const response: AxiosResponse<TokenInfoResponse> = await axios.post(
      "https://api.accret.fun/v1/tokenInfo",
      body,
      { headers },
    );

    if (response.status === 404) {
      return {
        statusCode: 404,
        message: "Token not found",
      };
    }

    return response.data;
  } catch (error) {
    return {
      statusCode: 500,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
