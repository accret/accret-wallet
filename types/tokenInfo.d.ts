interface TokenInfoError {
  statusCode: number;
  message: string;
}

interface TokenInfoSuccess {
  data: TokenInfoData;
}

interface TokenInfoData {
  chain: TokenInfoChain;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  spamStatus: string;
  links: TokenInfoLink[];
  id: string;
  description: string;
  totalSupply: string;
  circulatingSupply: string;
  marketCap: string;
  marketCap24hChangePercentage: number;
  volume24hUSD: number;
  volume24hUSDChangePercentage: number;
  trades24h: number;
  trades24hChangePercentage: number;
  uniqueWallets24h: number;
  uniqueWallets24hChangePercentage: number;
}

interface TokenInfoChain {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
}

interface TokenInfoLink {
  type: string;
  url: string;
}

type TokenInfoResponse = TokenInfoSuccess | TokenInfoError;

export {
  TokenInfoResponse,
  TokenInfoSuccess,
  TokenInfoError,
  TokenInfoChain,
  TokenInfoData,
  TokenInfoLink,
};
