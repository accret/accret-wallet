import {
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getMint,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

export interface TransactionFeeInfo {
  estimatedFee: number; // in SOL
  hasSufficientSol: boolean;
  currentSolBalance: number; // in SOL
  computeUnits?: number;
}

export async function estimateTransactionFee({
  tokenMintAddress,
  recipientAddress,
  amount,
}: {
  tokenMintAddress: string;
  recipientAddress: string;
  amount: number;
}): Promise<TransactionFeeInfo> {
  const account = await getCurrentAccount();

  if (!account?.svm) {
    throw new Error("No Solana account found");
  }

  const solanaAccount = account.svm;

  if (!solanaAccount) {
    throw new Error("No Solana account found");
  }

  const rpcUrl = getRpcUrl("solana:101");
  const connection = new Connection(rpcUrl, "confirmed");
  const sender = new PublicKey(solanaAccount.publicKey);
  const recipient = new PublicKey(recipientAddress);

  // Get sender's SOL balance for sufficiency checks
  const balance = await connection.getBalance(sender);
  const solBalance = balance / LAMPORTS_PER_SOL;

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  try {
    if (tokenMintAddress.toUpperCase() === "SOL") {
      // Native SOL transfer
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      });

      // Create simulation instructions with placeholder compute unit limit
      const simulationInstructions = [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000, // High value for simulation
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1n,
        }),
        transferInstruction,
      ];

      // Create simulation message
      const simulationMessage = new TransactionMessage({
        payerKey: sender,
        recentBlockhash: blockhash,
        instructions: simulationInstructions,
      }).compileToV0Message();

      // Create versioned transaction for simulation
      const simulationTransaction = new VersionedTransaction(simulationMessage);

      // Simulate transaction with the new API
      const simulationResponse = await connection.simulateTransaction(
        simulationTransaction,
        { sigVerify: false },
      );
      const estimatedUnits = simulationResponse.value.unitsConsumed || 200_000; // Default if not provided

      // Create final transaction message with compute budget instructions
      const messageV0 = new TransactionMessage({
        payerKey: sender,
        recentBlockhash: blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({
            units: estimatedUnits,
          }),
          transferInstruction,
        ],
      }).compileToV0Message();

      // Calculate fee
      const fees = await connection.getFeeForMessage(messageV0);
      const feeInSol =
        (fees.value !== null ? fees.value : 5000) / LAMPORTS_PER_SOL;

      // Check if user has enough SOL for both transfer and fee
      const hasSufficientSol = solBalance >= amount + feeInSol;

      return {
        estimatedFee: feeInSol,
        hasSufficientSol,
        currentSolBalance: solBalance,
        computeUnits: estimatedUnits,
      };
    } else {
      // SPL token transfer
      const mint = new PublicKey(tokenMintAddress);

      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(mint, sender);

      const recipientTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipient,
      );

      // Get token information to calculate the correct amount with decimals
      const mintInfo = await getMint(connection, mint);
      const adjustedAmount = Math.floor(amount * 10 ** mintInfo.decimals);

      // Create instructions
      let instructions = [];

      // Check if recipient token account needs to be created
      const recipientAccountInfo = await connection.getAccountInfo(
        recipientTokenAccount,
      );
      if (!recipientAccountInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            sender,
            recipientTokenAccount,
            recipient,
            mint,
          ),
        );
      }

      // Add transfer instruction
      instructions.push(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          sender,
          adjustedAmount,
        ),
      );

      // Create simulation instructions
      const simulationInstructions = [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000, // High value for simulation
        }),
        ...instructions,
      ];

      // Create simulation message
      const simulationMessage = new TransactionMessage({
        payerKey: sender,
        recentBlockhash: blockhash,
        instructions: simulationInstructions,
      }).compileToV0Message();

      // Create versioned transaction for simulation
      const simulationTransaction = new VersionedTransaction(simulationMessage);

      // Simulate transaction with the new API
      const simulationResponse = await connection.simulateTransaction(
        simulationTransaction,
        { sigVerify: false },
      );
      const estimatedUnits = simulationResponse.value.unitsConsumed || 250_000; // Default for SPL if not provided

      // Create final transaction message with compute budget instructions
      const messageV0 = new TransactionMessage({
        payerKey: sender,
        recentBlockhash: blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({
            units: estimatedUnits,
          }),
          ...instructions,
        ],
      }).compileToV0Message();

      // Calculate fee
      const fees = await connection.getFeeForMessage(messageV0);
      const feeInSol =
        (fees.value !== null ? fees.value : 5000) / LAMPORTS_PER_SOL;

      // For SPL tokens, we just need enough SOL for the fee
      const hasSufficientSol = solBalance >= feeInSol;

      return {
        estimatedFee: feeInSol,
        hasSufficientSol,
        currentSolBalance: solBalance,
        computeUnits: estimatedUnits,
      };
    }
  } catch (error) {
    console.error("Error estimating transaction fee:", error);

    // Provide a fallback estimate if simulation fails
    const fallbackFee = 0.000005; // 5000 lamports
    return {
      estimatedFee: fallbackFee,
      hasSufficientSol: solBalance >= fallbackFee,
      currentSolBalance: solBalance,
    };
  }
}

export async function createEncodedTokenTransferInstruction({
  tokenMintAddress,
  recipientAddress,
  amount,
}: {
  tokenMintAddress: string;
  recipientAddress: string;
  amount: number;
}): Promise<string> {
  const account = await getCurrentAccount();

  if (!account?.svm) {
    throw new Error("No Solana account found");
  }

  const solanaAccount = account.svm;

  if (!solanaAccount) {
    throw new Error("No Solana account found");
  }

  const rpcUrl = getRpcUrl("solana:101");
  const connection = new Connection(rpcUrl, "confirmed");
  const sender = new PublicKey(solanaAccount.publicKey);
  const recipient = new PublicKey(recipientAddress);

  const transaction = new Transaction();

  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = sender;

    // First, estimate the fee and get compute unit information
    const feeInfo = await estimateTransactionFee({
      tokenMintAddress,
      recipientAddress,
      amount,
    });

    if (!feeInfo.hasSufficientSol) {
      throw new Error(
        `Insufficient SOL balance for transaction fee. Need at least ${feeInfo.estimatedFee} SOL.`,
      );
    }

    // Add compute unit limit instruction using estimated units from fee calculation
    const computeUnitLimit = feeInfo.computeUnits || 200_000; // Default if not provided
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnitLimit,
      }),
    );

    if (tokenMintAddress.toUpperCase() === "SOL") {
      // Native SOL transfer
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        }),
      );
    } else {
      // SPL token transfer
      const mint = new PublicKey(tokenMintAddress);

      // Get token information to calculate the correct amount with decimals
      const mintInfo = await getMint(connection, mint);
      const adjustedAmount = Math.floor(amount * 10 ** mintInfo.decimals);

      // Get token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(mint, sender);

      const recipientTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipient,
      );

      const recipientAccountInfo = await connection.getAccountInfo(
        recipientTokenAccount,
      );
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            sender,
            recipientTokenAccount,
            recipient,
            mint,
          ),
        );
      }

      // Add the token transfer instruction
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          sender,
          adjustedAmount,
        ),
      );
    }

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Return the base64 encoded transaction
    return serializedTransaction.toString("base64");
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(
      `Failed to create transaction: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
