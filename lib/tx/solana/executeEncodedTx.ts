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
import { solana_rpc_url } from "@/lib/tx/rpcUrl";

export default async function executeEncodedTx(
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

  const rpcUrl = solana_rpc_url;

  const connection = new Connection(rpcUrl, "confirmed");

  const buffer = Buffer.from(encodedInstruction, "base64");

  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");

    let signature: TransactionSignature;

    if (buffer[0] === 0x80) {
      // Versioned transaction
      const tx = VersionedTransaction.deserialize(buffer);
      // Sign the transaction
      tx.sign([signer]);

      // Send transaction - no retries
      signature = await connection.sendTransaction(tx, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 0, // No retries
      });
    } else {
      // Legacy transaction
      const tx = Transaction.from(buffer);

      // Update with fresh blockhash
      tx.recentBlockhash = blockhash;
      tx.feePayer = signer.publicKey;

      // Sign the transaction
      tx.partialSign(signer);

      // Send transaction - no retries
      signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 0, // No retries
      });
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
    throw error;
  }
}
