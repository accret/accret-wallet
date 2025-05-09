const api_key = "33ff93b152dd4681a4282c0e6cd4452a";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export function getRpcUrl(chainId: ChainId) {
  switch (chainId) {
    case "solana:101":
      return `https://grateful-jerrie-fast-mainnet.helius-rpc.com`;
    case "eip155:1":
      return `https://mainnet.infura.io/v3/${api_key}`;
    case "eip155:137":
      return `https://polygon-mainnet.infura.io/v3/${api_key}`;
    case "eip155:8453":
      return `https://base-mainnet.infura.io/v3/${api_key}`;
    case "eip155:42161":
      return `https://arbitrum-mainnet.infura.io/v3/${api_key}`;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}
