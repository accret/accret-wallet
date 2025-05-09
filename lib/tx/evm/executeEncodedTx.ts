import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";
import { ethers } from "ethers";

export interface EVMTransactionResult {
  hash: string;
  blockNumber?: number;
  status: boolean;
  error?: string;
}

type ChainId =
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export async function executeEncodedTx(
  encodedTransaction: string,
  chainId: ChainId,
): Promise<EVMTransactionResult> {
  const account = await getCurrentAccount();

  if (!account?.evm) {
    throw new Error("No EVM account found");
  }

  const evmAccount = account.evm;

  if (!evmAccount) {
    throw new Error("No EVM account found");
  }

  // Get the appropriate RPC URL based on the chain
  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    // Create a wallet instance with the private key
    const wallet = new ethers.Wallet(evmAccount.privateKey, provider);

    // Parse the encoded transaction
    const transaction = ethers.Transaction.from(encodedTransaction);

    // Send the transaction
    const txResponse = await wallet.sendTransaction({
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
      gasLimit: transaction.gasLimit,
      gasPrice: transaction.gasPrice,
      nonce: transaction.nonce,
      chainId: transaction.chainId,
    });

    console.log("Transaction sent with hash:", txResponse.hash);

    // Wait for transaction confirmation
    const receipt = await txResponse.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    console.log("Transaction successfully processed:", receipt.blockNumber);

    return {
      hash: txResponse.hash,
      blockNumber: receipt.blockNumber,
      status: true,
    };
  } catch (error) {
    console.error("Error executing EVM transaction:", error);
    return {
      hash: "",
      status: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
