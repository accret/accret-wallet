const evm_api_key = "33ff93b152dd4681a4282c0e6cd4452a";
const solana_api_key = "786fa733-801c-4f10-8cf7-25e31ecb3ea9";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export function getRpcUrl(chainId: ChainId) {
  switch (chainId) {
    case "solana:101":
      return `https://mainnet.helius-rpc.com/?api-key=${solana_api_key}`;
    case "eip155:1":
      return `https://mainnet.infura.io/v3/${evm_api_key}`;
    case "eip155:137":
      return `https://polygon-mainnet.infura.io/v3/${evm_api_key}`;
    case "eip155:8453":
      return `https://base-mainnet.infura.io/v3/${evm_api_key}`;
    case "eip155:42161":
      return `https://arbitrum-mainnet.infura.io/v3/${evm_api_key}`;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}
