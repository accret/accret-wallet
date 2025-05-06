import axios, { AxiosResponse } from "axios";
import type { PriceHistoryResponse } from "@/types/priceHistory";

type TimeRangeType = "1H" | "1D" | "1W" | "1M" | "YTD" | "ALL";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export default async function fetchPriceHistory(
  network: ChainId,
  tokenAddress: string,
  timeRange: TimeRangeType,
): Promise<PriceHistoryResponse> {
  try {
    const body = {
      network,
      tokenAddress,
      timeRange,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    const response: AxiosResponse<PriceHistoryResponse> = await axios.post(
      "https://api.accret.fun/v1/priceHistory",
      body,
      { headers },
    );

    if (response.status === 404) {
      return {
        statusCode: 400,
        message: "Invalid queries, check 'errors' property for more info.",
        errors: {
          type: [
            "type must be one of the following values: 1H, 1D, 1W, 1M, YTD, ALL",
          ],
        },
      };
    }

    return response.data;
  } catch (error) {
    return {
      statusCode: 500,
      message: error instanceof Error ? error.message : "Unknown error",
      errors: {
        type: [error instanceof Error ? error.message : "Unknown error"],
      },
    };
  }
}
