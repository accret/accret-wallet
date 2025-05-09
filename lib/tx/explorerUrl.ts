type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export function getExplorerUrl(chainId: ChainId, txHash: string): string {
  switch (chainId) {
    case "solana:101":
      return `https://explorer.solana.com/tx/${txHash}`;
    case "eip155:1":
      return `https://etherscan.io/tx/${txHash}`;
    case "eip155:137":
      return `https://polygonscan.com/tx/${txHash}`;
    case "eip155:8453":
      return `https://basescan.org/tx/${txHash}`;
    case "eip155:42161":
      return `https://arbiscan.io/tx/${txHash}`;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}
