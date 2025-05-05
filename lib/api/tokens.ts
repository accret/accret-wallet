import axios, { AxiosResponse } from "axios";
import { TokensResponse } from "@/types/tokens";
import { getCurrentAccount } from "@/lib/accountStorage";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

interface AddressEntry {
  chainId: ChainId;
  address: string;
}

export default async function fetchTokens(): Promise<TokensResponse> {
  try {
    const body: AddressEntry[] = [];

    const currentAccount = await getCurrentAccount();

    if (currentAccount?.evm) {
      body.push({
        chainId: "eip155:1", // Ethereum Mainnet
        address: currentAccount.evm.publicKey,
      });
      body.push({
        chainId: "eip155:137", // Polygon Mainnet
        address: currentAccount.evm.publicKey,
      });
      body.push({
        chainId: "eip155:8453", // Base Mainnet
        address: currentAccount.evm.publicKey,
      });
      body.push({
        chainId: "eip155:42161", // Arbitrum Mainnet
        address: currentAccount.evm.publicKey,
      });
    }

    if (currentAccount?.svm) {
      body.push({
        chainId: "solana:101", // Solana Mainnet
        address: currentAccount.svm.publicKey.toString(),
      });
    }

    const headers = {
      "Content-Type": "application/json",
    };

    const response: AxiosResponse<TokensResponse> = await axios.post(
      "https://api.accret.fun/v1/tokens",
      body,
      { headers },
    );
    return response.data;
  } catch (error) {
    console.log("Error fetching tokens:", error);
    return {
      tokens: [],
      isTrimmed: false,
      errors: [],
    } as TokensResponse;
  }
}
