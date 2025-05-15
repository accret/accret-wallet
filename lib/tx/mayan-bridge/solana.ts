import { type Quote, swapFromSolana } from "@mayanfinance/swap-sdk";
import { Keypair } from "@solana/web3.js";
import { Connection } from "@mayanfinance/swap-sdk/node_modules/@solana/web3.js";
import bs58 from "bs58";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

export async function swapSolana(
  quote: Quote,
  destAddr: string,
): Promise<string> {
  // Get Solana wallet from account storage
  const account = await getCurrentAccount();
  if (!account?.svm) {
    throw new Error("No Solana account found");
  }

  const privateKey = account.svm.privateKey;
  const privateKeyArray = bs58.decode(privateKey);
  const wallet = Keypair.fromSecretKey(privateKeyArray);

  // Set up connection to Solana
  const rpcUrl = getRpcUrl("solana:101");
  const connection = new Connection(rpcUrl);

  // Create transaction signer function
  const signer = async (trx: any) => {
    if ("version" in trx) {
      trx.sign([wallet]);
    } else {
      trx.sign(wallet);
    }
    return trx;
  };

  const referrerAddress = {
    solana: "69izdTrBfvhpuq8LgWifstGbHTZC6DKn1w5wLpdjapfF",
    evm: "0xD0208Bfe9Ae201Cc2baE4e4b5a74561472A7a910",
  };

  try {
    // Execute the swap
    const swapRes = await swapFromSolana(
      quote,
      wallet.publicKey.toString(),
      destAddr,
      referrerAddress,
      signer,
      connection,
      [],
      { skipPreflight: true },
    );

    if (!swapRes.signature) {
      throw new Error("Failed to execute Solana swap: No signature returned");
    }

    // Confirm transaction
    try {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const result = await connection.confirmTransaction(
        {
          signature: swapRes.signature,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight,
        },
        "confirmed",
      );

      if (result?.value.err) {
        throw new Error(
          `Transaction ${swapRes.signature} reverted: ${JSON.stringify(result.value.err)}`,
        );
      }

      return swapRes.signature;
    } catch (error) {
      // As fallback, check if transaction exists via Mayan API
      try {
        const res = await fetch(
          `https://explorer-api.mayan.finance/v3/swap/trx/${swapRes.signature}`,
        );

        if (res.status !== 200) {
          throw error;
        }

        return swapRes.signature;
      } catch (apiError) {
        console.error("Error checking transaction status:", apiError);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error executing Solana swap:", error);
    throw error;
  }
}
