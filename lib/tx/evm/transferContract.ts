import { ethers } from "ethers";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
] as const;

type ChainId =
  | "eip155:1" // Ethereum Mainnet
  | "eip155:137" // Polygon Mainnet
  | "eip155:8453" // Base Mainnet
  | "eip155:42161"; // Arbitrum Mainnet

export interface TransactionFeeInfo {
  estimatedFee: string; // in ETH
  hasSufficientBalance: boolean;
  currentBalance: string; // in ETH
  gasLimit: number;
  gasPrice: string;
}

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
  const account = await getCurrentAccount();

  if (!account?.evm) {
    throw new Error("No EVM account found");
  }

  const evmAccount = account.evm;

  if (!evmAccount) {
    throw new Error("No EVM account found");
  }

  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(evmAccount.privateKey, provider);

  try {
    // Get current ETH balance
    const balance = await provider.getBalance(wallet.address);
    const ethBalance = ethers.formatEther(balance);

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const formattedGasPrice = ethers.formatUnits(gasPrice, "gwei");

    // Estimate gas limit
    let gasLimit: number;
    if (tokenAddress.toLowerCase() === "eth") {
      // Native ETH transfer
      gasLimit = 21000; // Standard gas limit for ETH transfers
    } else {
      // ERC20 token transfer
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider,
      );
      const decimals = await tokenContract.decimals();
      const amountWithDecimals = ethers.parseUnits(amount.toString(), decimals);

      // Estimate gas for token transfer
      const estimatedGas = await tokenContract.transfer.estimateGas(
        recipientAddress,
        amountWithDecimals,
        { from: wallet.address },
      );
      gasLimit = Number(estimatedGas);
    }

    // Calculate estimated fee
    const estimatedFee = ethers.formatEther(gasPrice * BigInt(gasLimit));

    // Check if user has enough balance for the fee
    const hasSufficientBalance =
      parseFloat(ethBalance) >= parseFloat(estimatedFee);

    return {
      estimatedFee,
      hasSufficientBalance,
      currentBalance: ethBalance,
      gasLimit,
      gasPrice: formattedGasPrice,
    };
  } catch (error) {
    console.error("Error estimating transaction fee:", error);
    throw error;
  }
}

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
  const account = await getCurrentAccount();

  if (!account?.evm) {
    throw new Error("No EVM account found");
  }

  const evmAccount = account.evm;

  if (!evmAccount) {
    throw new Error("No EVM account found");
  }

  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(evmAccount.privateKey, provider);

  try {
    // First, estimate the fee
    const feeInfo = await estimateTransactionFee({
      tokenAddress,
      recipientAddress,
      amount,
      chainId,
    });

    if (!feeInfo.hasSufficientBalance) {
      throw new Error(
        `Insufficient ETH balance for transaction fee. Need at least ${feeInfo.estimatedFee} ETH.`,
      );
    }

    let transaction: ethers.TransactionRequest;

    if (tokenAddress.toLowerCase() === "eth") {
      // Native ETH transfer
      transaction = {
        to: recipientAddress,
        value: ethers.parseEther(amount.toString()),
        gasLimit: feeInfo.gasLimit,
        gasPrice: ethers.parseUnits(feeInfo.gasPrice, "gwei"),
      };
    } else {
      // ERC20 token transfer
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider,
      );
      const decimals = await tokenContract.decimals();
      const amountWithDecimals = ethers.parseUnits(amount.toString(), decimals);

      // Create the transaction data
      const data = tokenContract.interface.encodeFunctionData("transfer", [
        recipientAddress,
        amountWithDecimals,
      ]);

      transaction = {
        to: tokenAddress,
        data,
        gasLimit: feeInfo.gasLimit,
        gasPrice: ethers.parseUnits(feeInfo.gasPrice, "gwei"),
      };
    }

    // Get the current nonce
    const nonce = await provider.getTransactionCount(wallet.address);
    transaction.nonce = nonce;

    // Get the chain ID
    const network = await provider.getNetwork();
    transaction.chainId = network.chainId;

    // Create and serialize the transaction using the wallet
    const tx = await wallet.populateTransaction(transaction);
    const signedTx = await wallet.signTransaction(tx);
    return signedTx;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(
      `Failed to create transaction: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
