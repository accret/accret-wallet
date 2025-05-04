export interface Chain {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
}

export enum SpamStatus {
  NOT_VERIFIED = "NOT_VERIFIED",
  POSSIBLE_SPAM = "POSSIBLE_SPAM",
  VERIFIED = "VERIFIED",
}

export interface BaseData {
  chain: Chain;
  walletAddress: string;
  decimals: number;
  amount: string;
  logoUri: string;
  name: string;
  symbol: string;
  coingeckoId: string | null;
  spamStatus: SpamStatus;
}

export interface ERC20Data extends BaseData {
  contractAddress: string;
}

export interface SPLMintExtension {
  extension: string;
  state: Record<string, unknown>;
}

export interface SPLData extends BaseData {
  mintAddress: string;
  splTokenAccountPubkey: string;
  programId: string;
  mintExtensions?: SPLMintExtension[];
}

export type NativeType =
  | "EthereumNative"
  | "PolygonNative"
  | "ArbitrumNative"
  | "BaseNative"
  | "SolanaNative";

export interface NativeToken {
  type: NativeType;
  data: BaseData;
}

export interface ERC20Token {
  type: "ERC20";
  data: ERC20Data;
}

export interface SPLToken {
  type: "SPL";
  data: SPLData;
}

export type Token = NativeToken | ERC20Token | SPLToken;

export interface TokensResponse {
  tokens: Token[];
  isTrimmed: boolean;
  errors: [];
}
