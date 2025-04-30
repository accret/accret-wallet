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

const ACCOUNT_STORAGE_KEY = "AISHzt0ifcbIV9bra3DE5eJQT9veElqiCEl4CuPlTA";
const CURRENT_ACCOUNT_ID_KEY = "gRwE83aoCzn0JXmM0MMWVLJPOrC2O9wXjCNxCTezXjE";
const DEFAULT_SVM_DERIVATION_PATH = "m/44'/501'/0'/0'";
const DEFAULT_EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

if (ACCOUNT_STORAGE_KEY === undefined || CURRENT_ACCOUNT_ID_KEY === undefined) {
  throw new Error(
    "ACCOUNT_STORAGE_KEY or CURRENT_ACCOUNT_ID_KEY is not defined",
  );
}

async function getAllAccounts(): Promise<AccountStorage[]> {
  try {
    const accountsData = await SecureStore.getItemAsync(ACCOUNT_STORAGE_KEY);
    if (accountsData) {
      return JSON.parse(accountsData);
    }
    return [];
  } catch (error) {
    console.error("Failed to get accounts from secure storage", error);
    return [];
  }
}

async function saveAllAccounts(accounts: AccountStorage[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(accounts),
    );
  } catch (error) {
    console.error("Failed to save accounts to secure storage", error);
    throw error;
  }
}

async function getAccountById(
  accountId: string,
): Promise<AccountStorage | null> {
  try {
    const accounts = await getAllAccounts();
    return (
      accounts.find((account) => account.userAccountID === accountId) || null
    );
  } catch (error) {
    console.error("Failed to get account by ID", error);
    return null;
  }
}

async function saveAccount(accountToSave: AccountStorage): Promise<void> {
  try {
    const accounts = await getAllAccounts();
    const existingIndex = accounts.findIndex(
      (account) => account.userAccountID === accountToSave.userAccountID,
    );

    if (existingIndex >= 0) {
      // Update existing account
      accounts[existingIndex] = accountToSave;
    } else {
      // Add new account
      accounts.push(accountToSave);
    }

    await saveAllAccounts(accounts);
  } catch (error) {
    console.error("Failed to save account", error);
    throw error;
  }
}

async function getOrCreateAccount(
  userAccountID: string,
  userAccountName: string,
): Promise<AccountStorage> {
  const existingAccount = await getAccountById(userAccountID);

  if (existingAccount) {
    // Update the name if it changed
    if (existingAccount.userAccountName !== userAccountName) {
      existingAccount.userAccountName = userAccountName;
      await saveAccount(existingAccount);
    }
    return existingAccount;
  }

  // Create a new account
  const newAccount: AccountStorage = {
    userAccountID,
    userAccountName,
  };

  await saveAccount(newAccount);
  return newAccount;
}

async function setCurrentAccountId(accountId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CURRENT_ACCOUNT_ID_KEY, accountId);
  } catch (error) {
    console.error("Failed to set current account ID", error);
    throw error;
  }
}

async function getCurrentAccountId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CURRENT_ACCOUNT_ID_KEY);
  } catch (error) {
    console.error("Failed to get current account ID", error);
    return null;
  }
}

async function getCurrentAccount(): Promise<AccountStorage | null> {
  const currentId = await getCurrentAccountId();
  if (!currentId) return null;

  return await getAccountById(currentId);
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

    const accountStorage = await getOrCreateAccount(
      userAccountID,
      userAccountName,
    );
    accountStorage.svm = svmAccount;
    await saveAccount(accountStorage);

    // Set as current account if no current account is set
    const currentId = await getCurrentAccountId();
    if (!currentId) {
      await setCurrentAccountId(userAccountID);
    }

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

    const accountStorage = await getOrCreateAccount(
      userAccountID,
      userAccountName,
    );
    accountStorage.svm = svmAccount;
    await saveAccount(accountStorage);

    // Set as current account if no current account is set
    const currentId = await getCurrentAccountId();
    if (!currentId) {
      await setCurrentAccountId(userAccountID);
    }

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

    const accountStorage = await getOrCreateAccount(
      userAccountID,
      userAccountName,
    );
    accountStorage.evm = evmAccount;
    await saveAccount(accountStorage);

    // Set as current account if no current account is set
    const currentId = await getCurrentAccountId();
    if (!currentId) {
      await setCurrentAccountId(userAccountID);
    }

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

    const accountStorage = await getOrCreateAccount(
      userAccountID,
      userAccountName,
    );
    accountStorage.evm = evmAccount;
    await saveAccount(accountStorage);

    // Set as current account if no current account is set
    const currentId = await getCurrentAccountId();
    if (!currentId) {
      await setCurrentAccountId(userAccountID);
    }

    console.log("Connected to EVM (Ethereum) Account with private key");
  } catch (error) {
    console.error("Failed to connect EVM account with private key", error);
    throw error;
  }
}

export async function disconnectSVMAccount(
  userAccountID: string,
): Promise<void> {
  try {
    const account = await getAccountById(userAccountID);
    if (account) {
      delete account.svm;
      await saveAccount(account);
      console.log(
        "Disconnected from SVM (Solana) Account for user:",
        userAccountID,
      );
    }
  } catch (error) {
    console.error("Failed to disconnect SVM account", error);
    throw error;
  }
}

export async function disconnectEVMAccount(
  userAccountID: string,
): Promise<void> {
  try {
    const account = await getAccountById(userAccountID);
    if (account) {
      delete account.evm;
      await saveAccount(account);
      console.log(
        "Disconnected from EVM (Ethereum) Account for user:",
        userAccountID,
      );
    }
  } catch (error) {
    console.error("Failed to disconnect EVM account", error);
    throw error;
  }
}

export async function disconnectAccount(userAccountID: string): Promise<void> {
  try {
    const accounts = await getAllAccounts();
    const updatedAccounts = accounts.filter(
      (account) => account.userAccountID !== userAccountID,
    );

    await saveAllAccounts(updatedAccounts);

    // If we deleted the current account, set a new current account if available
    const currentId = await getCurrentAccountId();
    if (currentId === userAccountID) {
      if (updatedAccounts.length > 0) {
        await setCurrentAccountId(updatedAccounts[0].userAccountID);
      } else {
        await SecureStore.deleteItemAsync(CURRENT_ACCOUNT_ID_KEY);
      }
    }

    console.log("Disconnected account:", userAccountID);
  } catch (error) {
    console.error("Failed to disconnect account", error);
    throw error;
  }
}

export async function disconnectAllAccounts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY);
    await SecureStore.deleteItemAsync(CURRENT_ACCOUNT_ID_KEY);
    console.log("Disconnected from all accounts");
  } catch (error) {
    console.error("Failed to disconnect all accounts", error);
    throw error;
  }
}

export async function getAllAccountsInfo(): Promise<
  { id: string; name: string }[]
> {
  try {
    const accounts = await getAllAccounts();
    return accounts.map((account) => ({
      id: account.userAccountID,
      name: account.userAccountName,
    }));
  } catch (error) {
    console.error("Failed to get accounts info", error);
    return [];
  }
}

export async function switchAccount(userAccountID: string): Promise<void> {
  try {
    const account = await getAccountById(userAccountID);
    if (!account) {
      throw new Error(`Account with ID ${userAccountID} not found`);
    }

    await setCurrentAccountId(userAccountID);
    console.log("Switched to account:", userAccountID);
  } catch (error) {
    console.error("Failed to switch account", error);
    throw error;
  }
}

export async function useCurrentAccount(): Promise<AccountStorage | null> {
  return await getCurrentAccount();
}

export async function useCurrentSVMAccount(): Promise<SVM_Account | null> {
  try {
    const account = await getCurrentAccount();
    return account?.svm || null;
  } catch (error) {
    console.error("Failed to get current SVM account", error);
    return null;
  }
}

export async function useCurrentEVMAccount(): Promise<EVM_Account | null> {
  try {
    const account = await getCurrentAccount();
    return account?.evm || null;
  } catch (error) {
    console.error("Failed to get current EVM account", error);
    return null;
  }
}

export async function getSVMAccountById(
  userAccountID: string,
): Promise<SVM_Account | null> {
  try {
    const account = await getAccountById(userAccountID);
    return account?.svm || null;
  } catch (error) {
    console.error("Failed to get SVM account by ID", error);
    return null;
  }
}

export async function getEVMAccountById(
  userAccountID: string,
): Promise<EVM_Account | null> {
  try {
    const account = await getAccountById(userAccountID);
    return account?.evm || null;
  } catch (error) {
    console.error("Failed to get EVM account by ID", error);
    return null;
  }
}
