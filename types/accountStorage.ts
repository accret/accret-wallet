import type { PublicKey } from "@solana/web3.js";

export interface SVM_Account {
  publicKey: PublicKey;
  privateKey: string;
  secretKey: Uint8Array;
  seedPhrase?: string[];
  derivationPath?: string;
}

export interface EVM_Account {
  publicKey: string;
  privateKey: string;
  secretKey: Uint8Array;
  seedPhrase?: string[];
  derivationPath?: string;
}

export interface AccountStorage {
  svm?: SVM_Account;
  evm?: EVM_Account;
  userAccountID: string;
  userAccountName: string;
}
