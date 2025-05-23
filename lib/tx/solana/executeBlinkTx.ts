import bs58 from "bs58";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  RpcResponseAndContext,
  SignatureResult,
  TransactionSignature,
} from "@solana/web3.js";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

export async function executeBlinkTx(
  encodedInstruction: string,
): Promise<RpcResponseAndContext<SignatureResult> & { signature: string }> {
  const account = await getCurrentAccount();

  if (!account?.svm) {
    throw new Error("No Solana account found");
  }

  const secretKeyDecoded = bs58.decode(account.svm.privateKey);
  const signer = Keypair.fromSecretKey(secretKeyDecoded);

  const rpcUrl = getRpcUrl("solana:101");
  const connection = new Connection(rpcUrl, "confirmed");

  const buffer = Buffer.from(encodedInstruction, "base64");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("finalized");

  let signature: TransactionSignature;

  try {
    let isVersioned = false;
    let tx: Transaction | VersionedTransaction;

    try {
      // First try as versioned
      tx = VersionedTransaction.deserialize(buffer);
      isVersioned = true;
      console.log("Parsed as versioned transaction");
    } catch (e) {
      console.log("Failed to parse as versioned transaction:", e);
      try {
        // Fallback: legacy
        tx = Transaction.from(buffer);
        console.log("Parsed as legacy transaction");
      } catch (finalErr) {
        console.error("Failed to parse transaction:", finalErr);
        throw new Error("Invalid transaction format: not versioned or legacy");
      }
    }

    // --- Handle versioned ---
    if (isVersioned) {
      const versionedTx = tx as VersionedTransaction;

      const isSigned = versionedTx.signatures.every(
        (sig) => sig.length === 64 && sig.some((b) => b !== 0),
      );

      if (!isSigned) {
        versionedTx.sign([signer]);
      } else {
        console.log("Versioned transaction already signed.");
      }

      signature = await connection.sendTransaction(versionedTx, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 0,
      });
    }
    // --- Handle legacy ---
    else {
      const legacyTx = tx as Transaction;

      const isSigned = legacyTx.signatures.every(
        (sig) => sig.signature && sig.signature.length === 64,
      );

      if (!isSigned) {
        legacyTx.recentBlockhash = blockhash;
        legacyTx.feePayer = signer.publicKey;
        legacyTx.partialSign(signer);
      } else {
        console.log("Legacy transaction already signed.");
      }

      signature = await connection.sendRawTransaction(legacyTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 0,
      });
    }

    console.log("Transaction sent with signature:", signature);

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
      );
    }

    return {
      context: confirmation.context,
      value: confirmation.value,
      signature,
    };
  } catch (error) {
    console.error("Transaction execution failed:", error);
    throw error;
  }
}
