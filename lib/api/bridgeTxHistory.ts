import axios from "axios";
import type { AccountStorage } from "@/types/accountStorage";

export interface BridgeTxHistoryType {
  data: Datum[];
  metadata: Metadata;
}

export interface Datum {
  trader: string;
  sourceTxHash: string;
  sourceChain: string;
  swapChain: string;
  destChain: string;
  fromAmount: string;
  fromTokenAddress: string;
  fromTokenChain: string;
  fromTokenSymbol: string;
  fromTokenLogoUri: string;
  fromTokenPrice: number;
  toTokenPrice: number;
  toTokenAddress: string;
  toTokenChain: string;
  toTokenSymbol: string;
  toTokenLogoUri: string;
  destAddress: string;
  status: string;
  clientStatus: string;
  initiatedAt: Date;
  toAmount: string;
  stateAddr: string;
  service: string;
  statusUpdatedAt: Date;
  auctionMode: number | null;
  referrerBps: number | null;
  mayanBps: number | null;
  orderHash: null | string;
  cctpNonce: null;
  clientRelayerFeeSuccess?: number;
  clientRelayerFeeRefund: number;
  orderId: string;
}

export interface Metadata {
  count: number;
  volume: number;
}

export async function getBridgeTxHistory({
  account,
}: {
  account: AccountStorage;
}): Promise<BridgeTxHistoryType> {
  if (!account) {
    throw new Error("Account is required");
  }

  if (!account.svm || !account.evm) {
    throw new Error("Either SVM or EVM account is required");
  }

  const svmPubkey: string = account.svm.publicKey.toString();
  const evmPubkey: string = account.evm.publicKey.toString();

  const [svmResponse, evmResponse] = await Promise.all([
    axios.get(
      `https://explorer-api.mayan.finance/v3/swaps/trader?trader=${svmPubkey}`,
    ),
    axios.get(
      `https://explorer-api.mayan.finance/v3/swaps/trader?trader=${evmPubkey}`,
    ),
  ]);

  const svmData = svmResponse.data.data;
  const evmData = evmResponse.data.data;
  const mergedData = [...svmData, ...evmData];

  const filteredData = mergedData.filter((item: Datum) => {
    if (item.orderId) {
      return item.orderId !== null;
    }
    return true;
  });

  const sortedData = filteredData.sort((a: Datum, b: Datum) => {
    const dateA = new Date(a.initiatedAt);
    const dateB = new Date(b.initiatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  const response: BridgeTxHistoryType = {
    data: sortedData,
    metadata: {
      count: sortedData.length,
      volume: sortedData.reduce((acc: number, item: Datum) => {
        const amount = parseFloat(item.fromAmount);
        return acc + amount;
      }, 0),
    },
  };
  return response;
}
