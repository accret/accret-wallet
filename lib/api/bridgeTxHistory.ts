import axios from "axios";
import type { AccountStorage } from "@/types/accountStorage";

export interface BridgeTxHistoryType {
  data: Datum[];
  metadata: Metadata;
}

export interface Datum {
  trader: string;
  sourceTxHash: string;
  sourceChain: string;
  swapChain: string;
  destChain: string;
  fromAmount: string;
  fromTokenAddress: string;
  fromTokenChain: string;
  fromTokenSymbol: string;
  fromTokenLogoUri: string;
  fromTokenPrice: number;
  toTokenPrice: number;
  toTokenAddress: string;
  toTokenChain: string;
  toTokenSymbol: string;
  toTokenLogoUri: string;
  destAddress: string;
  status: string;
  clientStatus: string;
  initiatedAt: Date;
  toAmount: string;
  stateAddr: string;
  service: string;
  statusUpdatedAt: Date;
  auctionMode: number | null;
  referrerBps: number | null;
  mayanBps: number | null;
  orderHash: null | string;
  cctpNonce: null;
  clientRelayerFeeSuccess?: number;
  clientRelayerFeeRefund: number;
  orderId: string;
}

export interface Metadata {
  count: number;
  volume: number;
}

export async function getBridgeTxHistory({
  account,
}: {
  account: AccountStorage;
}): Promise<BridgeTxHistoryType> {
  if (!account) {
    throw new Error("Account is required");
  }

  if (!account.svm || !account.evm) {
    throw new Error("Either SVM or EVM account is required");
  }

  const svmPubkey: string = account.svm.publicKey.toString();
  const evmPubkey: string = account.evm.publicKey.toString();

  const [svmResponse, evmResponse] = await Promise.all([
    axios.get(
      `https://explorer-api.mayan.finance/v3/swaps/trader?trader=${svmPubkey}`,
    ),
    axios.get(
      `https://explorer-api.mayan.finance/v3/swaps/trader?trader=${evmPubkey}`,
    ),
  ]);

  const svmData = svmResponse.data.data;
  const evmData = evmResponse.data.data;
  const mergedData = [...svmData, ...evmData];

  // Create a Map to store unique transactions by orderId
  const uniqueTransactions = new Map<string, Datum>();

  // Add transactions to the Map, keeping only the most recent one for each orderId
  mergedData.forEach((item: Datum) => {
    if (item.orderId) {
      const existingItem = uniqueTransactions.get(item.orderId);
      if (
        !existingItem ||
        new Date(item.initiatedAt) > new Date(existingItem.initiatedAt)
      ) {
        uniqueTransactions.set(item.orderId, item);
      }
    } else {
      // For transactions without orderId, use sourceTxHash as identifier
      const existingItem = uniqueTransactions.get(item.sourceTxHash);
      if (
        !existingItem ||
        new Date(item.initiatedAt) > new Date(existingItem.initiatedAt)
      ) {
        uniqueTransactions.set(item.sourceTxHash, item);
      }
    }
  });

  // Convert Map values back to array
  const filteredData = Array.from(uniqueTransactions.values());

  const sortedData = filteredData.sort((a: Datum, b: Datum) => {
    const dateA = new Date(a.initiatedAt);
    const dateB = new Date(b.initiatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  const response: BridgeTxHistoryType = {
    data: sortedData,
    metadata: {
      count: sortedData.length,
      volume: sortedData.reduce((acc: number, item: Datum) => {
        const amount = parseFloat(item.fromAmount);
        return acc + amount;
      }, 0),
    },
  };
  return response;
}

export type TransactionStatus =
  | "success"
  | "pending"
  | "failed"
  | "reverted"
  | "unknown";

export interface StatusInfo {
  color: string;
  text: string;
  icon: string;
}

/**
 * Gets the human-readable chain name
 */
export function getChainName(chainId: string): string {
  const chainMap: Record<string, string> = {
    solana: "Solana",
    ethereum: "Ethereum",
    polygon: "Polygon",
    base: "Base",
    arbitrum: "Arbitrum",
  };
  return chainMap[chainId] || chainId;
}

/**
 * Get normalized status from various status fields
 */
export function getNormalizedStatus(transaction: Datum): TransactionStatus {
  const status = transaction.status?.toLowerCase();
  const clientStatus = transaction.clientStatus?.toUpperCase();

  if (status === "success" || clientStatus === "CONFIRMED") {
    return "success";
  } else if (status === "pending" || clientStatus === "PENDING") {
    return "pending";
  } else if (status === "failed" || clientStatus === "FAILED") {
    return "failed";
  } else if (status === "reverted" || clientStatus === "REVERTED") {
    return "reverted";
  }

  return "unknown";
}

/**
 * Format date for display
 */
export function formatTransactionDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

/**
 * Format amount to be more readable
 */
export function formatTokenAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return "0";

  // For very small numbers, use scientific notation
  if (num < 0.0001) {
    return num.toExponential(4);
  }

  // For regular numbers, use fixed point with an appropriate number of decimals
  if (num >= 1000) {
    return num.toFixed(2);
  } else if (num >= 1) {
    return num.toFixed(4);
  } else {
    return num.toFixed(6);
  }
}

/**
 * Calculate estimated USD value of transaction
 */
export function calculateUsdValue(amount: string, price: number): string {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || !price) return "$0.00";

  const value = numAmount * price;

  if (value >= 1000) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  } else {
    return `$${value.toExponential(2)}`;
  }
}

/**
 * Determine if transaction is cross-chain
 */
export function isCrossChainTransaction(transaction: Datum): boolean {
  return transaction.sourceChain !== transaction.destChain;
}
