/* eslint-disable import/first */
import "react-native-get-random-values";
global.Buffer = global.Buffer || require("buffer").Buffer;

import bs58 from "bs58";
import * as bip39 from "bip39";
import { Wallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import { HDKey as SVM_HD_KEY } from "micro-ed25519-hdkey";
import { hdkey as EVM_HD_KEY } from "@ethereumjs/wallet";
import type {
  SVM_Account,
  EVM_Account,
  AccountStorage,
} from "@/types/accountStorage";

const ACCOUNT_STORAGE_KEY = process.env.ACCOUNT_STORAGE_KEY!;
const DEFAULT_SVM_DERIVATION_PATH = "m/44'/501'/0'/0'";
const DEFAULT_EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

if (ACCOUNT_STORAGE_KEY === undefined) {
  throw new Error("ACCOUNT_STORAGE_KEY is not defined");
}

async function getAccountStorage(): Promise<AccountStorage | null> {
  try {
    const accountStorage = await SecureStore.getItemAsync(ACCOUNT_STORAGE_KEY);
    if (accountStorage) {
      return JSON.parse(accountStorage);
    }
    return null;
  } catch (error) {
    console.error("Failed to get account storage from secure storage", error);
    return null;
  }
}

async function saveAccountStorage(
  accountStorage: AccountStorage,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(accountStorage),
    );
  } catch (error) {
    console.error("Failed to save account storage to secure storage", error);
    throw error;
  }
}

async function initializeAccountStorage(
  userAccountID: string,
  userAccountName: string,
): Promise<AccountStorage> {
  const existingStorage = await getAccountStorage();
  if (existingStorage) {
    existingStorage.userAccountID = userAccountID;
    existingStorage.userAccountName = userAccountName;
    return existingStorage;
  }

  return {
    userAccountID,
    userAccountName,
  };
}

export async function connectSVMAccountWithSeedPhrase(
  userAccountID: string,
  userAccountName: string,
  seedPhrase: string[],
): Promise<void> {
  try {
    const mnemonic = seedPhrase.join(" ");

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid seed phrase");
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic, "");
    const hd = SVM_HD_KEY.fromMasterSeed(seed.toString("hex"));
    const path = DEFAULT_SVM_DERIVATION_PATH;
    const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
    const privateKey = bs58.encode(keypair.secretKey);

    const svmAccount: SVM_Account = {
      publicKey: keypair.publicKey,
      privateKey,
      secretKey: keypair.secretKey,
      seedPhrase,
      derivationPath: path,
    };

    const accountStorage = await initializeAccountStorage(
      userAccountID,
      userAccountName,
    );
    accountStorage.svm = svmAccount;
    await saveAccountStorage(accountStorage);

    console.log(
      "Connected to SVM (Solana) Account with seed phrase using derivation path:",
      path,
    );
  } catch (error) {
    console.error("Failed to connect SVM account with seed phrase", error);
    throw error;
  }
}

export async function connectSVMAccountWithPrivateKey(
  userAccountID: string,
  userAccountName: string,
  privateKey: string,
): Promise<void> {
  try {
    const keypair = Keypair.fromSeed(
      Uint8Array.from(bs58.decode(privateKey).slice(0, 32)),
    );

    const svmAccount: SVM_Account = {
      publicKey: keypair.publicKey,
      privateKey,
      secretKey: keypair.secretKey,
    };

    const accountStorage = await initializeAccountStorage(
      userAccountID,
      userAccountName,
    );
    accountStorage.svm = svmAccount;
    await saveAccountStorage(accountStorage);

    console.log("Connected to SVM (Solana) Account with private key");
  } catch (error) {
    console.error("Failed to connect SVM account with private key", error);
    throw error;
  }
}

export async function connectEVMAccountWithSeedPhrase(
  userAccountID: string,
  userAccountName: string,
  seedPhrase: string[],
): Promise<void> {
  try {
    const mnemonic = seedPhrase.join(" ");

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid seed phrase");
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic, "");
    const hdWallet = EVM_HD_KEY.EthereumHDKey.fromMasterSeed(seed);
    const path = DEFAULT_EVM_DERIVATION_PATH;
    const childKey = hdWallet.derivePath(path);
    const privateKeyBuffer = childKey.getWallet().getPrivateKey();

    if (!privateKeyBuffer) {
      throw new Error("Failed to derive private key");
    }

    const wallet = new Wallet(Buffer.from(privateKeyBuffer).toString("hex"));
    const privateKey = wallet.privateKey;
    const publicKey = wallet.address;
    const secretKey = new Uint8Array(privateKeyBuffer);

    const evmAccount: EVM_Account = {
      publicKey,
      privateKey,
      secretKey,
      seedPhrase,
      derivationPath: path,
    };

    const accountStorage = await initializeAccountStorage(
      userAccountID,
      userAccountName,
    );
    accountStorage.evm = evmAccount;
    await saveAccountStorage(accountStorage);

    console.log(
      "Connected to EVM (Ethereum) Account with seed phrase using derivation path:",
      path,
    );
  } catch (error) {
    console.error("Failed to connect EVM account with seed phrase", error);
    throw error;
  }
}

export async function connectEVMAccountWithPrivateKey(
  userAccountID: string,
  userAccountName: string,
  privateKey: string,
): Promise<void> {
  try {
    // Ensure privateKey has 0x prefix
    const normalizedPrivateKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`;
    const wallet = new Wallet(normalizedPrivateKey);

    const evmAccount: EVM_Account = {
      publicKey: wallet.address,
      privateKey: normalizedPrivateKey,
      secretKey: new Uint8Array(Buffer.from(wallet.privateKey.slice(2), "hex")),
    };

    const accountStorage = await initializeAccountStorage(
      userAccountID,
      userAccountName,
    );
    accountStorage.evm = evmAccount;
    await saveAccountStorage(accountStorage);

    console.log("Connected to EVM (Ethereum) Account with private key");
  } catch (error) {
    console.error("Failed to connect EVM account with private key", error);
    throw error;
  }
}

export async function disconnectSVMAccount(): Promise<void> {
  try {
    const accountStorage = await getAccountStorage();
    if (accountStorage) {
      delete accountStorage.svm;
      await saveAccountStorage(accountStorage);
      console.log("Disconnected from SVM (Solana) Account");
    }
  } catch (error) {
    console.error("Failed to disconnect SVM account", error);
    throw error;
  }
}

export async function disconnectEVMAccount(): Promise<void> {
  try {
    const accountStorage = await getAccountStorage();
    if (accountStorage) {
      delete accountStorage.evm;
      await saveAccountStorage(accountStorage);
      console.log("Disconnected from EVM (Ethereum) Account");
    }
  } catch (error) {
    console.error("Failed to disconnect EVM account", error);
    throw error;
  }
}

export async function disconnectAllAccounts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY);
    console.log("Disconnected from all accounts");
  } catch (error) {
    console.error("Failed to disconnect all accounts", error);
    throw error;
  }
}

export async function useAccountStorage(): Promise<AccountStorage | null> {
  try {
    return await getAccountStorage();
  } catch (error) {
    console.error("Failed to get account storage", error);
    return null;
  }
}

export async function useSVMAccount(): Promise<SVM_Account | null> {
  try {
    const accountStorage = await getAccountStorage();
    return accountStorage?.svm || null;
  } catch (error) {
    console.error("Failed to get SVM account", error);
    return null;
  }
}

export async function useEVMAccount(): Promise<EVM_Account | null> {
  try {
    const accountStorage = await getAccountStorage();
    return accountStorage?.evm || null;
  } catch (error) {
    console.error("Failed to get EVM account", error);
    return null;
  }
}
