import {
  addresses,
  swapFromEvm,
  type Erc20Permit,
  type Quote,
} from "@mayanfinance/swap-sdk";
import {
  Wallet,
  Contract,
  TransactionResponse,
  Signature,
  parseUnits,
  JsonRpcProvider,
  TypedDataEncoder,
} from "ethers";
import { abi as ERC20Permit_ABI } from "./contracts/ERC20Permit.json";
import MayanForwarderArtifact from "./contracts/MayanForwarderArtifact";
import { getCurrentAccount } from "@/lib/accountStorage";
import { getRpcUrl } from "@/lib/tx/rpcUrl";

export async function swapEVM(quote: Quote, destAddr: string): Promise<string> {
  // Get the EVM wallet from the account storage
  const account = await getCurrentAccount();
  if (!account?.evm) {
    throw new Error("No EVM account found");
  }

  const privateKey = account.evm.privateKey;
  const wallet = new Wallet(privateKey);

  // Get provider based on the chain
  const chainId = quote.fromChain;
  let chain: "eip155:1" | "eip155:137" | "eip155:8453" | "eip155:42161";

  // Convert chain ID number to our format
  switch (chainId) {
    case "ethereum":
      chain = "eip155:1"; // Ethereum
      break;
    case "polygon":
      chain = "eip155:137"; // Polygon
      break;
    case "base":
      chain = "eip155:8453"; // Base
      break;
    case "arbitrum":
      chain = "eip155:42161"; // Arbitrum
      break;
    default:
      throw new Error(`Unsupported EVM chain ID: ${chainId}`);
  }

  const rpcUrl = getRpcUrl(chain);
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);
  const walletSrcAddr = await wallet.getAddress();

  // Get permit or allowance for token
  let permit: Erc20Permit | undefined = await getErcPermitOrAllowance(
    quote,
    signer as any,
    walletSrcAddr,
  );

  try {
    // Execute the swap
    const swapRes = await swapFromEvm(
      quote,
      walletSrcAddr,
      destAddr,
      null,
      signer as any,
      permit,
      null,
      null,
    );

    if (typeof swapRes === "string") {
      throw new Error(swapRes);
    }

    return (swapRes as unknown as TransactionResponse).hash;
  } catch (error) {
    console.error("Error executing EVM swap:", error);
    throw error;
  }
}

async function getErcPermitOrAllowance(
  quote: Quote,
  signer: Wallet,
  walletSrcAddr: string,
): Promise<Erc20Permit | undefined> {
  try {
    const tokenContract = new Contract(
      quote.fromToken.contract,
      ERC20Permit_ABI,
      signer,
    );

    const amountIn = getAmountOfFractionalAmount(
      quote.effectiveAmountIn,
      quote.fromToken.decimals,
    );

    // Check if token supports permit
    if (quote.fromToken.supportsPermit) {
      const nonce = await tokenContract.nonces(walletSrcAddr);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

      const domain = {
        name: await tokenContract.name(),
        version: "1",
        chainId: quote.fromToken.chainId,
        verifyingContract: await tokenContract.getAddress(),
      };

      // Get domain separator
      const domainSeparator = await tokenContract.DOMAIN_SEPARATOR();

      // Try different versions to match the domain separator
      for (let i = 1; i < 11; i++) {
        domain.version = String(i);
        const hash = TypedDataEncoder.hashDomain(domain);
        if (hash.toLowerCase() === domainSeparator.toLowerCase()) {
          break;
        }
      }

      // Determine spender address
      let spender = addresses.MAYAN_FORWARDER_CONTRACT;
      if (quote.type === "SWIFT" && quote.gasless) {
        const forwarderContract = new Contract(
          addresses.MAYAN_FORWARDER_CONTRACT,
          MayanForwarderArtifact.abi,
          signer.provider,
        );

        const isValidSwiftContract = await forwarderContract.mayanProtocols(
          quote.swiftMayanContract,
        );

        if (!isValidSwiftContract) {
          throw new Error("Invalid Swift contract for gasless swap");
        }

        if (!quote.swiftMayanContract) {
          throw new Error("Swift contract not found");
        }

        spender = quote.swiftMayanContract;
      }

      // Permit data structure
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const value = {
        owner: walletSrcAddr,
        spender,
        value: amountIn,
        nonce,
        deadline,
      };

      // Sign the permit
      const signature = await signer.signTypedData(domain, types, value);
      const { v, r, s } = Signature.from(signature);

      // Execute permit transaction
      const permitTx = await tokenContract.permit(
        walletSrcAddr,
        spender,
        amountIn,
        deadline,
        v,
        r,
        s,
      );

      await permitTx.wait();

      return {
        value: amountIn,
        deadline,
        v,
        r,
        s,
      };
    } else {
      // Token doesn't support permit, use approval instead
      const allowance: bigint = await tokenContract.allowance(
        walletSrcAddr,
        addresses.MAYAN_FORWARDER_CONTRACT,
      );

      if (allowance < amountIn) {
        const approveTx = await tokenContract.approve(
          addresses.MAYAN_FORWARDER_CONTRACT,
          amountIn,
        );

        await approveTx.wait();
      }

      return undefined;
    }
  } catch (error) {
    console.error("Error in getErcPermitOrAllowance:", error);
    throw error;
  }
}

// Helper function to convert amount to bigint with proper decimal places
function getAmountOfFractionalAmount(
  amount: string | number,
  decimals: string | number,
): bigint {
  const cutFactor = Math.min(8, Number(decimals));
  const numStr = Number(amount).toFixed(cutFactor + 1);
  const reg = new RegExp(`^-?\\d+(?:\\.\\d{0,${cutFactor}})?`);
  const matchResult = numStr.match(reg);

  if (!matchResult) {
    throw new Error("getAmountOfFractionalAmount: fixedAmount is null");
  }

  const fixedAmount = matchResult[0];
  return parseUnits(fixedAmount, Number(decimals));
}
