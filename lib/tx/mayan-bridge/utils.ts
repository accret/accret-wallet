import { getCurrentAccount } from "@/lib/accountStorage";

// Get current account's private key for the specified chain
export async function getPrivateKeyForChain(
  chain: "solana" | "evm",
): Promise<string> {
  const account = await getCurrentAccount();

  if (chain === "solana") {
    if (!account?.svm) {
      throw new Error("No Solana account available");
    }
    return account.svm.privateKey;
  } else if (chain === "evm") {
    if (!account?.evm) {
      throw new Error("No EVM account available");
    }
    return account.evm.privateKey;
  }

  throw new Error(`Unsupported chain type: ${chain}`);
}

// Format amount for display with correct decimal places
export function formatAmount(
  amount: number | string,
  decimals: number,
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return "0";
  }

  // For very small amounts, use scientific notation
  if (numAmount < 0.000001 && numAmount > 0) {
    return numAmount.toExponential(6);
  }

  // For normal amounts, limit decimal places based on size
  const precision =
    numAmount >= 1 ? Math.min(6, decimals) : Math.min(8, decimals);

  return numAmount.toFixed(precision);
}

// Calculate estimated fee for bridging
export function calculateEstimatedFee(amount: number): number {
  // Typical fee is around 0.3-0.5% of the amount
  return amount * 0.004; // 0.4% fee
}
