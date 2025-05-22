import {
  Connection,
  SignatureResult,
  RpcResponseAndContext,
} from "@solana/web3.js";
import { getRpcUrl } from "../rpcUrl";

export async function executeBlinkTx(
  encodedTransaction: string,
): Promise<RpcResponseAndContext<SignatureResult>> {
  const connection = new Connection(getRpcUrl("solana:101"));

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("finalized");

  const tx = Buffer.from(encodedTransaction, "base64");
  const signature = await connection.sendRawTransaction(tx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 0, // No retries
  });

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return {
    context: confirmation.context,
    value: { err: null },
    signature: signature,
  } as RpcResponseAndContext<SignatureResult> & { signature: string };
}
