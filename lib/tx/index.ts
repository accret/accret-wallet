import {
  TransactionFeeInfo as EVMTransactionFeeInfo,
  estimateTransactionFee as estimateEVMTransactionFee,
  createEncodedTokenTransferInstruction as createEVMEncodedTokenTransferInstruction,
} from "./evm/transferContract";
import { executeEncodedTx as executeEVMEncodedTx } from "./evm/executeEncodedTx";

import {
  TransactionFeeInfo as SolanaTransactionFeeInfo,
  estimateTransactionFee as estimateSolanaTransactionFee,
  createEncodedTokenTransferInstruction as createSolanaEncodedTokenTransferInstruction,
} from "./solana/transferInstruction";
import { executeEncodedTx as executeSolanaEncodedTx } from "./solana/executeEncodedTx";

type ChainId =
  | "solana:101" // Solana Mainnet
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

// Unified interfaces for cross-chain compatibility
export type TransactionFeeInfo =
  | EVMTransactionFeeInfo
  | SolanaTransactionFeeInfo;

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  status: boolean;
  error?: string;
}

// Type guard to check if the fee info is from EVM
function isEVMFeeInfo(
  feeInfo: TransactionFeeInfo,
): feeInfo is EVMTransactionFeeInfo {
  return "gasLimit" in feeInfo;
}

// Unified function to estimate transaction fees
export async function estimateTransactionFee({
  tokenAddress,
  recipientAddress,
  amount,
  chainId,
}: {
  tokenAddress: string;
  recipientAddress: string;
  amount: number;
  chainId: ChainId;
}): Promise<TransactionFeeInfo> {
  if (chainId === "solana:101") {
    return estimateSolanaTransactionFee({
      tokenMintAddress: tokenAddress,
      recipientAddress,
      amount,
    });
  } else {
    return estimateEVMTransactionFee({
      tokenAddress,
      recipientAddress,
      amount,
      chainId,
    });
  }
}

// Unified function to create encoded transfer instructions
export async function createEncodedTokenTransferInstruction({
  tokenAddress,
  recipientAddress,
  amount,
  chainId,
}: {
  tokenAddress: string;
  recipientAddress: string;
  amount: number;
  chainId: ChainId;
}): Promise<string> {
  if (chainId === "solana:101") {
    return createSolanaEncodedTokenTransferInstruction({
      tokenMintAddress: tokenAddress,
      recipientAddress,
      amount,
    });
  } else {
    return createEVMEncodedTokenTransferInstruction({
      tokenAddress,
      recipientAddress,
      amount,
      chainId,
    });
  }
}

// Unified function to execute encoded transactions
export async function executeEncodedTx(
  encodedTransaction: string,
  chainId: ChainId,
): Promise<TransactionResult> {
  if (chainId === "solana:101") {
    const result = await executeSolanaEncodedTx(encodedTransaction);
    return {
      hash: (result as any).signature || "",
      status: !result.value.err,
      error: result.value.err ? JSON.stringify(result.value.err) : undefined,
    };
  } else {
    return executeEVMEncodedTx(encodedTransaction, chainId);
  }
}

// Unified function to handle the complete transfer process
export async function executeTokenTransfer({
  tokenAddress,
  recipientAddress,
  amount,
  chainId,
}: {
  tokenAddress: string;
  recipientAddress: string;
  amount: number;
  chainId: ChainId;
}): Promise<TransactionResult> {
  try {
    // First estimate the fee
    const feeInfo = await estimateTransactionFee({
      tokenAddress,
      recipientAddress,
      amount,
      chainId,
    });

    // Check if user has sufficient balance based on chain type
    const hasSufficientBalance = isEVMFeeInfo(feeInfo)
      ? feeInfo.hasSufficientBalance
      : feeInfo.hasSufficientSol;

    if (!hasSufficientBalance) {
      throw new Error(
        `Insufficient balance for transaction fee. Need at least ${feeInfo.estimatedFee} ${chainId === "solana:101" ? "SOL" : "ETH"}.`,
      );
    }

    // Create the encoded transaction
    const encodedTx = await createEncodedTokenTransferInstruction({
      tokenAddress,
      recipientAddress,
      amount,
      chainId,
    });

    // Execute the transaction
    return executeEncodedTx(encodedTx, chainId);
  } catch (error) {
    console.error("Error executing token transfer:", error);
    return {
      hash: "",
      status: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
