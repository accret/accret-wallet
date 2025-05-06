interface PriceHistoryError {
  statusCode: number;
  message: string;
  errors: {
    type: string[];
  };
}

interface PriceHistorySuccess {
  history: History[];
}

interface History {
  unixTime: number;
  value: string;
}

type PriceHistoryResponse = PriceHistorySuccess | PriceHistoryError;

export { PriceHistoryError, PriceHistorySuccess, PriceHistoryResponse };
