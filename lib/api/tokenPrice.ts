import axios, { AxiosResponse } from "axios";

interface TokenPriceSuccess {
  price: number;
  priceChange24h: number;
  lastUpdatedAt: Date;
}

interface TokenPriceError {
  statusCode: number;
  message: string;
}

export type TokenPriceResponse = TokenPriceSuccess | TokenPriceError;

export type ChainId =
  | "solana:101"
  | "eip155:1"
  | "eip155:137"
  | "eip155:8453"
  | "eip155:42161";

export default async function fetchTokenPrice(
  network: ChainId,
  tokenAddress: string,
): Promise<TokenPriceResponse> {
  try {
    const body = {
      network,
      tokenAddress,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    const response: AxiosResponse<TokenPriceResponse> = await axios.post(
      "https://api.accret.fun/v1/tokenPrice",
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
