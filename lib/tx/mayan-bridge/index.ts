import { fetchQuote, type ChainName, type Quote } from "@mayanfinance/swap-sdk";
import { swapSolana } from "./solana";
import { swapEVM } from "./evm";
import { formatAmount, calculateEstimatedFee } from "./utils";
import { fetchSupportedTokens } from "./fetchSupportedTokens";

export interface BridgeParams {
  fromChain: ChainName;
  fromToken: string;
  toChain: ChainName;
  toToken: string;
  amount: number;
  destAddr: string;
  slippageBps?: string | number;
}

export interface QuoteResult {
  quote: Quote;
  details: {
    fromTokenName: string;
    fromChain: string;
    toTokenName: string;
    toChain: string;
    amount: string;
    minAmountOut: string;
    estimatedFee: string;
  };
}

/**
 * Get a bridge quote for the specified parameters
 */
export async function getQuote(params: BridgeParams): Promise<QuoteResult> {
  const { fromChain, fromToken, toChain, toToken, amount } = params;

  const supportedChains = ["solana", "ethereum", "base", "polygon", "arbitrum"];
  const referrerAddress = {
    solana: "69izdTrBfvhpuq8LgWifstGbHTZC6DKn1w5wLpdjapfF",
    evm: "0xD0208Bfe9Ae201Cc2baE4e4b5a74561472A7a910",
  };

  if (
    !supportedChains.includes(fromChain) ||
    !supportedChains.includes(toChain)
  ) {
    throw new Error(
      "Chain not supported. Supported chains: solana, ethereum, base, polygon, arbitrum",
    );
  }

  const referrer =
    fromChain === "solana" || fromChain === "polygon"
      ? referrerAddress.solana
      : referrerAddress.evm;

  const quotes = await fetchQuote({
    amount,
    fromChain,
    fromToken,
    toChain,
    toToken,
    slippageBps: 300,
    referrer,
    referrerBps: 100,
  });

  if (quotes.length === 0) {
    throw new Error("No quotes found for the specified parameters");
  }

  const quote = quotes[0];
  const estimatedFee = calculateEstimatedFee(amount);

  console.log("quote", JSON.stringify(quote, null, 2));
  console.log("estimatedFee", estimatedFee);

  return {
    quote,
    details: {
      fromTokenName: quote.fromToken.name,
      fromChain: quote.fromChain,
      toTokenName: quote.toToken.name,
      toChain: quote.toChain,
      amount: formatAmount(amount, quote.fromToken.decimals),
      minAmountOut: quote.minAmountOut.toString(),
      estimatedFee: estimatedFee.toFixed(4),
    },
  };
}

/**
 * Execute a bridge transaction based on the provided quote
 */
export async function executeBridgeTransaction(
  quote: Quote,
  destAddr: string,
): Promise<string> {
  let txHash: string;

  if (quote.fromChain === "solana") {
    txHash = await swapSolana(quote, destAddr);
  } else {
    txHash = await swapEVM(quote, destAddr);
  }

  return txHash;
}

/**
 * Get the explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://explorer.mayan.finance/swap/${txHash}`;
}

export { fetchSupportedTokens };
