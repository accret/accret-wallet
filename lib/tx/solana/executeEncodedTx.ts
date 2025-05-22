import bs58 from "bs58";
import { getCurrentAccount } from "@/lib/accountStorage";
import type { RpcResponseAndContext, SignatureResult } from "@solana/web3.js";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  TransactionSignature,
} from "@solana/web3.js";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

export async function executeEncodedTx(
  encodedInstruction: string,
): Promise<RpcResponseAndContext<SignatureResult>> {
  const account = await getCurrentAccount();

  if (!account?.svm) {
    throw new Error("No Solana account found");
  }

  const solanaAccount = account.svm;

  if (!solanaAccount) {
    throw new Error("No Solana account found");
  }

  const secretKeyDecoded = bs58.decode(solanaAccount.privateKey);
  const signer = Keypair.fromSecretKey(secretKeyDecoded);

  const rpcUrl = getRpcUrl("solana:101");
  const connection = new Connection(rpcUrl, "confirmed");

  const buffer = Buffer.from(encodedInstruction, "base64");

  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");

    let signature: TransactionSignature;

    // Check if this is a versioned transaction by looking at the version byte
    if (buffer[0] & 0x80) {
      // Versioned transaction (version bit is set)
      console.log("Processing versioned transaction");

      try {
        // Try to deserialize as VersionedTransaction first
        const tx = VersionedTransaction.deserialize(buffer);

        // Sign the transaction
        tx.sign([signer]);

        // Send transaction
        signature = await connection.sendTransaction(tx, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 0,
        });
      } catch (deserializeError) {
        console.log(
          "Failed to deserialize as VersionedTransaction, trying alternative method:",
          deserializeError,
        );

        // Alternative approach: try to handle as raw transaction data
        try {
          // If the above fails, it might be a raw transaction that needs to be sent directly
          signature = await connection.sendRawTransaction(buffer, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 0,
          });
        } catch (rawError) {
          console.error("Failed to send as raw transaction:", rawError);
          throw new Error(
            `Failed to process versioned transaction: ${deserializeError}`,
          );
        }
      }
    } else {
      // Legacy transaction
      console.log("Processing legacy transaction");

      try {
        const tx = Transaction.from(buffer);

        // Update with fresh blockhash
        tx.recentBlockhash = blockhash;
        tx.feePayer = signer.publicKey;

        // Sign the transaction
        tx.partialSign(signer);

        // Send transaction
        signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 0,
        });
      } catch (legacyError) {
        console.log(
          "Failed to process as legacy transaction, trying raw send:",
          legacyError,
        );

        // Fallback: try to send as raw transaction
        signature = await connection.sendRawTransaction(buffer, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 0,
        });
      }
    }

    console.log("Transaction sent with signature:", signature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(
        `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
      );
    }

    console.log(
      "Transaction successfully processed:",
      confirmation.context.slot,
    );

    return {
      context: confirmation.context,
      value: { err: null },
      // Store the signature as an additional property
      signature: signature,
    } as RpcResponseAndContext<SignatureResult> & { signature: string };
  } catch (error) {
    console.error("Error executing Solana transaction:", error);

    // If all else fails, try to send the transaction as-is (it might already be properly signed)
    try {
      console.log(
        "Attempting final fallback: sending transaction as raw bytes",
      );
      const signature = await connection.sendRawTransaction(buffer, {
        skipPreflight: true, // Skip preflight for this fallback
        preflightCommitment: "confirmed",
        maxRetries: 0,
      });

      console.log("Fallback transaction sent with signature:", signature);

      // Get fresh blockhash for confirmation
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return {
        context: confirmation.context,
        value: confirmation.value,
        signature: signature,
      } as RpcResponseAndContext<SignatureResult> & { signature: string };
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw error; // Throw the original error
    }
  }
}
