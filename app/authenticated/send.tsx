import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Linking,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import {
  useCurrentSVMAccount,
  useCurrentEVMAccount,
} from "@/lib/accountStorage";
import {
  SolanaIcon,
  EthereumIcon,
  PolygonIcon,
  BaseIcon,
  ArbitrumIcon,
  TokenPlaceholderIcon,
} from "@/icons";
import { formatTokenAmount, formatUsdValue } from "@/lib/api/portfolioUtils";
import { TokenWithPrice } from "@/lib/api/portfolioUtils";
import fetchTokens from "@/lib/api/tokens";
import {
  estimateTransactionFee,
  executeTokenTransfer,
  TransactionFeeInfo,
} from "@/lib/tx";
import { getExplorerUrl } from "@/lib/tx/explorerUrl";
import { Image } from "react-native";
import AddressValidation from "@/components/AddressValidation";
import CrossChainWarning from "@/components/CrossChainWarning";
import FeeInfoDisplay from "@/components/FeeInfoDisplay";
import SuccessAnimation from "@/components/SuccessAnimation";

// Chain types for the dropdown
const CHAINS = [
  {
    id: "solana:101",
    name: "Solana",
    icon: SolanaIcon,
    addressPrefix: "",
    addressRegex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    is_evm: false,
  },
  {
    id: "eip155:1",
    name: "Ethereum",
    icon: EthereumIcon,
    addressPrefix: "0x",
    addressRegex: /^(0x)?[0-9a-fA-F]{40}$/,
    is_evm: true,
  },
  {
    id: "eip155:137",
    name: "Polygon",
    icon: PolygonIcon,
    addressPrefix: "0x",
    addressRegex: /^(0x)?[0-9a-fA-F]{40}$/,
    is_evm: true,
  },
  {
    id: "eip155:8453",
    name: "Base",
    icon: BaseIcon,
    addressPrefix: "0x",
    addressRegex: /^(0x)?[0-9a-fA-F]{40}$/,
    is_evm: true,
  },
  {
    id: "eip155:42161",
    name: "Arbitrum",
    icon: ArbitrumIcon,
    addressPrefix: "0x",
    addressRegex: /^(0x)?[0-9a-fA-F]{40}$/,
    is_evm: true,
  },
];

// Modified Send flow steps - moved CHAIN_SELECT after RECIPIENT
enum SendStep {
  RECIPIENT = "RECIPIENT",
  CHAIN_SELECT = "CHAIN_SELECT",
  TOKEN_SELECT = "TOKEN_SELECT",
  AMOUNT = "AMOUNT",
  CONFIRM = "CONFIRM",
  RESULT = "RESULT",
}

export default function SendScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get the recipient address from params (if coming from QR scan)
  const recipientFromParams = params.recipientAddress as string;
  const chainIdFromParams = params.chainId as string;
  const preSelectedTokenParam = params.preSelectedToken as string;

  // State for the send flow
  const [currentStep, setCurrentStep] = useState<SendStep>(SendStep.RECIPIENT);
  const [selectedChain, setSelectedChain] = useState<(typeof CHAINS)[0] | null>(
    null,
  );
  const [recipientAddress, setRecipientAddress] = useState<string>(
    recipientFromParams || "",
  );
  const [selectedToken, setSelectedToken] = useState<TokenWithPrice | null>(
    null,
  );
  const [amount, setAmount] = useState<string>("");
  const [tokens, setTokens] = useState<TokenWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [filteredTokens, setFilteredTokens] = useState<TokenWithPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chainDropdownVisible, setChainDropdownVisible] = useState(false);
  const [feeInfo, setFeeInfo] = useState<TransactionFeeInfo | null>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedAddressType, setDetectedAddressType] = useState<
    "EVM" | "SOLANA" | null
  >(null);
  const [tokenUsdValue, setTokenUsdValue] = useState<number>(0);
  const [debouncedAmount, setDebouncedAmount] = useState<string>("");

  // Check if the wallet has the required accounts
  const [hasSVMAccount, setHasSVMAccount] = useState(false);
  const [hasEVMAccount, setHasEVMAccount] = useState(false);

  // Validate recipient address based on selected chain
  const validateAddress = (
    address: string,
    chain: (typeof CHAINS)[0],
  ): boolean => {
    if (!address) return false;

    // Check if address matches the chain's expected format
    return chain.addressRegex.test(address);
  };

  // State to track validation
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);

  // Detect address type
  const detectAddressType = useCallback((address: string) => {
    if (!address) {
      setDetectedAddressType(null);
      return;
    }

    // Check if it's a Solana address
    if (CHAINS[0].addressRegex.test(address)) {
      setDetectedAddressType("SOLANA");
      return;
    }

    // Check if it's an EVM address (starts with 0x and has correct length)
    if (address.startsWith("0x") && address.length === 42) {
      setDetectedAddressType("EVM");
      return;
    }

    setDetectedAddressType(null);
  }, []);

  // Validate address when it changes
  useEffect(() => {
    detectAddressType(recipientAddress);

    if (!recipientAddress || !selectedChain) {
      setIsAddressValid(false);
      return;
    }

    setIsValidatingAddress(true);

    // Use timeout to simulate network validation
    const timer = setTimeout(() => {
      setIsAddressValid(validateAddress(recipientAddress, selectedChain));
      setIsValidatingAddress(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [recipientAddress, selectedChain, detectAddressType]);

  // Set chain based on detected address type
  useEffect(() => {
    if (detectedAddressType === "SOLANA" && hasSVMAccount) {
      // If Solana address detected and account exists, auto-select Solana
      const solanaChain = CHAINS.find((chain) => chain.id === "solana:101");
      if (solanaChain) {
        setSelectedChain(solanaChain);
      }
    } else if (
      detectedAddressType === "EVM" &&
      hasEVMAccount &&
      currentStep === SendStep.RECIPIENT
    ) {
      // If EVM address detected and account exists, proceed to chain selection
      // setCurrentStep(SendStep.CHAIN_SELECT);
    }
  }, [detectedAddressType, hasSVMAccount, hasEVMAccount, currentStep]);

  // Debounce amount changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAmount(amount);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [amount]);

  // Update token USD value when amount changes or token selection changes
  useEffect(() => {
    if (selectedToken && debouncedAmount) {
      const numAmount = parseFloat(debouncedAmount) || 0;
      const value = numAmount * (selectedToken.priceUsd || 0);
      setTokenUsdValue(value);
    } else {
      setTokenUsdValue(0);
    }
  }, [debouncedAmount, selectedToken]);

  // Detect accounts
  useEffect(() => {
    const checkAccounts = async () => {
      try {
        setLoading(true);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const svmAccount = await useCurrentSVMAccount();
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const evmAccount = await useCurrentEVMAccount();

        setHasSVMAccount(!!svmAccount);
        setHasEVMAccount(!!evmAccount);

        // If we have a pre-selected token from params
        if (preSelectedTokenParam) {
          try {
            const preSelectedTokenData = JSON.parse(preSelectedTokenParam);
            // Find the chain based on the token's chain ID
            const tokenChainId = preSelectedTokenData.data.chainId;
            const chain = CHAINS.find((c) => c.id === tokenChainId);

            if (chain) {
              setSelectedChain(chain);
              // Load tokens for this chain
              await loadTokensForChain(chain.id);

              // We'll select the token after tokens are loaded in another effect
            }
          } catch (e) {
            console.error("Error parsing pre-selected token:", e);
          }
        }
        // If coming from QR scan with a specific address, detect the chain
        else if (recipientFromParams) {
          detectAddressType(recipientFromParams);
        } else if (chainIdFromParams) {
          // If chain ID was passed, set it
          const chain = CHAINS.find((c) => c.id === chainIdFromParams);
          if (chain) {
            setSelectedChain(chain);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking accounts:", error);
        setLoading(false);
      }
    };

    checkAccounts();
  }, [
    recipientFromParams,
    chainIdFromParams,
    preSelectedTokenParam,
    detectAddressType,
  ]);

  // Load tokens when chain is selected
  useEffect(() => {
    if (selectedChain) {
      loadTokensForChain(selectedChain.id);
    }
  }, [selectedChain]);

  // Handle pre-selected token after tokens are loaded
  useEffect(() => {
    if (preSelectedTokenParam && tokens.length > 0) {
      try {
        const preSelectedTokenData = JSON.parse(preSelectedTokenParam);
        // Find the matching token in our loaded tokens
        const matchingToken = tokens.find(
          (token) =>
            token.data.symbol === preSelectedTokenData.data.symbol &&
            token.type === preSelectedTokenData.type,
        );

        if (matchingToken) {
          setSelectedToken(matchingToken);
          // Move to amount entry screen directly if we have a token
          if (currentStep === SendStep.TOKEN_SELECT) {
            setCurrentStep(SendStep.AMOUNT);
          }
        }
      } catch (e) {
        console.error("Error selecting pre-selected token:", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedTokenParam, tokens]);

  // Fetch tokens for a specific chain
  const loadTokensForChain = async (chainId: string) => {
    try {
      setLoadingTokens(true);
      setError(null);

      // Fetch all tokens
      const tokensData = await fetchTokens();

      if (!tokensData.tokens || tokensData.tokens.length === 0) {
        setTokens([]);
        setFilteredTokens([]);
        setLoadingTokens(false);
        return;
      }

      // Get token prices and create TokenWithPrice objects
      // In a real app, you would fetch prices for these tokens
      const tokensWithPrice = tokensData.tokens.map((token) => ({
        ...token,
        usdValue: 0, // These would be populated from a price feed in a real app
        priceUsd: 0,
        priceChange24h: 0,
      }));

      // Filter tokens by the selected chain
      const chainTokens = tokensWithPrice.filter(
        (token) => token.data.chain.id === chainId,
      );

      // Find native token and put it first, then sort others by name
      const sortedTokens = chainTokens.sort((a, b) => {
        // Native tokens first
        const aIsNative = a.type.includes("Native");
        const bIsNative = b.type.includes("Native");

        if (aIsNative && !bIsNative) return -1;
        if (!aIsNative && bIsNative) return 1;

        // Then sort verified tokens before unverified
        const aIsVerified = a.data.spamStatus === "VERIFIED";
        const bIsVerified = b.data.spamStatus === "VERIFIED";

        if (aIsVerified && !bIsVerified) return -1;
        if (!aIsVerified && bIsVerified) return 1;

        // Then sort by balance (highest first)
        const aBalance = parseFloat(
          formatTokenAmount(a.data.amount, a.data.decimals),
        );
        const bBalance = parseFloat(
          formatTokenAmount(b.data.amount, b.data.decimals),
        );

        if (aBalance > bBalance) return -1;
        if (aBalance < bBalance) return 1;

        // Finally sort alphabetically
        return a.data.name.localeCompare(b.data.name);
      });

      setTokens(sortedTokens);
      setFilteredTokens(sortedTokens);
      setLoadingTokens(false);
    } catch (error) {
      console.error("Error loading tokens:", error);
      setError("Failed to load tokens. Please try again.");
      setLoadingTokens(false);
    }
  };

  // Filter tokens based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTokens(tokens);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tokens.filter(
      (token) =>
        token.data.name.toLowerCase().includes(query) ||
        token.data.symbol.toLowerCase().includes(query),
    );

    setFilteredTokens(filtered);
  }, [searchQuery, tokens]);

  // State for address chain mismatch detection
  const [detectedChainId, setDetectedChainId] = useState<string | null>(null);
  const [showChainMismatchWarning, setShowChainMismatchWarning] =
    useState(false);

  // Detect which chain an address belongs to
  const detectAddressChain = (address: string): string | null => {
    // Check Solana address pattern
    if (CHAINS[0].addressRegex.test(address)) {
      return "solana:101";
    }

    // Check Ethereum/EVM address pattern
    for (let i = 1; i < CHAINS.length; i++) {
      if (CHAINS[i].addressRegex.test(address)) {
        return CHAINS[i].id; // Return the specific EVM chain ID
      }
    }

    return null;
  };

  // Check for chain mismatch when address changes
  useEffect(() => {
    if (recipientAddress && selectedChain) {
      const detectedChain = detectAddressChain(recipientAddress);
      setDetectedChainId(detectedChain);

      // Only show warning if we detect a mismatch between chains
      if (detectedChain && detectedChain !== selectedChain.id) {
        // Don't warn for EVM-to-EVM changes (all EVM addresses look the same)
        const bothEVM =
          detectedChain.startsWith("eip155:") &&
          selectedChain.id.startsWith("eip155:");
        if (!bothEVM) {
          setShowChainMismatchWarning(true);
        }
      } else {
        setShowChainMismatchWarning(false);
      }
    } else {
      setShowChainMismatchWarning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientAddress, selectedChain]);

  // Handle switching to detected chain
  const switchToDetectedChain = () => {
    if (detectedChainId) {
      const chain = CHAINS.find((c) => c.id === detectedChainId);
      if (chain) {
        setSelectedChain(chain);
      }
      setShowChainMismatchWarning(false);
    }
  };

  // Handle dismissing chain mismatch warning
  const dismissChainMismatchWarning = () => {
    setShowChainMismatchWarning(false);
  };

  // Calculate the maximum amount the user can send
  const calculateMaxAmount = (): string => {
    if (!selectedToken) return "0";

    return formatTokenAmount(
      selectedToken.data.amount,
      selectedToken.data.decimals,
    );
  };

  // Set the maximum amount
  const handleSetMaxAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(calculateMaxAmount());
  };

  // Handle pasting from clipboard
  const handlePasteAddress = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        setRecipientAddress(clipboardText);
        // Try to detect the address type
        detectAddressType(clipboardText);
      }
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
    }
  };

  // Navigate to QR scanner
  const navigateToScanner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pass current chain to the camera if selected
    if (selectedChain) {
      router.push(`/authenticated/camera?chainId=${selectedChain.id}`);
    } else {
      router.push("/authenticated/camera");
    }
  };

  // Estimate the transaction fee
  const estimateFee = async () => {
    if (!selectedChain || !selectedToken || !recipientAddress || !amount) {
      return;
    }

    try {
      setEstimatingFee(true);
      setError(null);

      let tokenAddress = "";

      // Get the token address based on type
      if (selectedToken.type === "ERC20") {
        // For ERC20 tokens, use the contract address
        const erc20Data = selectedToken.data as any;
        tokenAddress = erc20Data.contractAddress;
      } else if (selectedToken.type === "SPL") {
        // For SPL tokens, use the mint address
        const splData = selectedToken.data as any;
        tokenAddress = splData.mintAddress;
      } else {
        // For native tokens, use the symbol
        tokenAddress = selectedChain.id === "solana:101" ? "SOL" : "ETH";
      }

      // Estimate the fee
      const fee = await estimateTransactionFee({
        tokenAddress,
        recipientAddress,
        amount: parseFloat(amount),
        chainId: selectedChain.id as any,
      });

      setFeeInfo(fee);
    } catch (error) {
      console.error("Error estimating fee:", error);
      setError(
        `Failed to estimate transaction fee: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setEstimatingFee(false);
    }
  };

  // Execute the transaction
  const executeTransaction = async () => {
    if (
      !selectedChain ||
      !selectedToken ||
      !recipientAddress ||
      !amount ||
      !feeInfo
    ) {
      return;
    }

    try {
      setProcessingTransaction(true);
      setError(null);

      let tokenAddress = "";

      // Get the token address based on type
      if (selectedToken.type === "ERC20") {
        // For ERC20 tokens, use the contract address
        const erc20Data = selectedToken.data as any;
        tokenAddress = erc20Data.contractAddress;
      } else if (selectedToken.type === "SPL") {
        // For SPL tokens, use the mint address
        const splData = selectedToken.data as any;
        tokenAddress = splData.mintAddress;
      } else {
        // For native tokens, use the symbol
        tokenAddress = selectedChain.id === "solana:101" ? "SOL" : "ETH";
      }

      // Execute the transfer
      const result = await executeTokenTransfer({
        tokenAddress,
        recipientAddress,
        amount: parseFloat(amount),
        chainId: selectedChain.id as any,
      });

      setTransactionResult(result);

      // Provide haptic feedback based on result
      if (result.status) {
        // Success vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Error vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Move to result step
      setCurrentStep(SendStep.RESULT);
    } catch (error) {
      console.error("Error executing transaction:", error);
      setError(
        `Transaction failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Error vibration
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessingTransaction(false);
    }
  };

  // Open transaction in explorer
  const openTransactionInExplorer = async () => {
    if (!transactionResult || !selectedChain) return;

    const url = getExplorerUrl(selectedChain.id as any, transactionResult.hash);

    if (url) {
      await Linking.openURL(url);
    }
  };

  // Reset the flow
  const resetFlow = () => {
    setCurrentStep(SendStep.RECIPIENT);
    setSelectedChain(null);
    setRecipientAddress("");
    setSelectedToken(null);
    setAmount("");
    setFeeInfo(null);
    setTransactionResult(null);
    setError(null);
    setDetectedAddressType(null);
  };

  // Handle going back in the flow
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === SendStep.RECIPIENT) {
      router.back();
      return;
    }

    if (currentStep === SendStep.CHAIN_SELECT) {
      setCurrentStep(SendStep.RECIPIENT);
      setSelectedChain(null);
    } else if (currentStep === SendStep.TOKEN_SELECT) {
      // If we detected a SOLANA address, go back to RECIPIENT, otherwise to CHAIN_SELECT
      if (detectedAddressType === "SOLANA") {
        setCurrentStep(SendStep.RECIPIENT);
        setSelectedChain(null);
      } else {
        setCurrentStep(SendStep.CHAIN_SELECT);
      }
    } else if (currentStep === SendStep.AMOUNT) {
      setCurrentStep(SendStep.TOKEN_SELECT);
      setAmount("");
    } else if (currentStep === SendStep.CONFIRM) {
      setCurrentStep(SendStep.AMOUNT);
      setFeeInfo(null);
    } else if (currentStep === SendStep.RESULT) {
      resetFlow();
    }
  };

  // Handle moving to the next step
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === SendStep.RECIPIENT) {
      if (!recipientAddress) {
        Alert.alert("Error", "Please enter a recipient address");
        return;
      }

      // If we have a Solana address & Solana account, move to token selection
      if (detectedAddressType === "SOLANA" && hasSVMAccount) {
        const solanaChain = CHAINS.find((chain) => chain.id === "solana:101");
        if (solanaChain) {
          setSelectedChain(solanaChain);
          setCurrentStep(SendStep.TOKEN_SELECT);
        } else {
          Alert.alert("Error", "Solana chain not found");
        }
      }
      // If we have an EVM address & EVM account, move to chain selection
      else if (detectedAddressType === "EVM" && hasEVMAccount) {
        setCurrentStep(SendStep.CHAIN_SELECT);
      }
      // If no address type detected, show error
      else if (!detectedAddressType) {
        Alert.alert(
          "Error",
          "Invalid address format. Please check and try again.",
        );
      }
      // If we have an address type but no matching account, show error
      else {
        Alert.alert(
          "Error",
          `You don't have a ${
            detectedAddressType === "SOLANA" ? "Solana" : "Ethereum"
          } account set up in this wallet.`,
        );
      }
    } else if (currentStep === SendStep.CHAIN_SELECT) {
      if (!selectedChain) {
        Alert.alert("Error", "Please select a blockchain");
        return;
      }

      // Validate address for the selected chain
      if (!validateAddress(recipientAddress, selectedChain)) {
        Alert.alert(
          "Error",
          `The address is not a valid ${selectedChain.name} address`,
        );
        return;
      }

      setCurrentStep(SendStep.TOKEN_SELECT);
    } else if (currentStep === SendStep.TOKEN_SELECT) {
      if (!selectedToken) {
        Alert.alert("Error", "Please select a token");
        return;
      }

      setCurrentStep(SendStep.AMOUNT);
    } else if (currentStep === SendStep.AMOUNT) {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert("Error", "Please enter a valid amount");
        return;
      }

      const maxAmount = parseFloat(calculateMaxAmount());
      if (parseFloat(amount) > maxAmount) {
        Alert.alert(
          "Error",
          `Insufficient balance. You can send a maximum of ${maxAmount} ${selectedToken!.data.symbol}`,
        );
        return;
      }

      // Estimate fee before moving to confirmation
      estimateFee().then(() => {
        setCurrentStep(SendStep.CONFIRM);
      });
    } else if (currentStep === SendStep.CONFIRM) {
      // Execute the transaction
      executeTransaction();
    } else if (currentStep === SendStep.RESULT) {
      // Go back to the portfolio screen
      router.replace("/authenticated/(tabs)/portfolio");
    }
  };

  // Get button text based on current step
  const getButtonText = () => {
    switch (currentStep) {
      case SendStep.RECIPIENT:
        return "Validate Address";
      case SendStep.CHAIN_SELECT:
        return "Select Chain";
      case SendStep.TOKEN_SELECT:
        return "Select Token";
      case SendStep.AMOUNT:
        return "Review Transaction";
      case SendStep.CONFIRM:
        return processingTransaction ? "Processing..." : "Send";
      case SendStep.RESULT:
        return "Done";
      default:
        return "Continue";
    }
  };

  // Get token logo URI with fallback
  const getTokenLogoUri = (token: TokenWithPrice) => {
    if (
      token.data.logoUri ===
      "https://wallet-asset.matic.network/img/tokens/matic.svg"
    ) {
      return "https://dhc7eusqrdwa0.cloudfront.net/assets/polygon.png";
    }
    return token.data.logoUri;
  };

  // Render recipient screen as first step
  const renderRecipientScreen = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Enter Recipient
        </Text>
        <Text style={[styles.stepDescription, { color: colors.secondaryText }]}>
          Enter the wallet address of the recipient
        </Text>

        <View
          style={[
            styles.addressInputContainer,
            {
              backgroundColor:
                theme === "dark" ? colors.inputBackground : colors.surface,
            },
          ]}>
          <TextInput
            style={[styles.addressInput, { color: colors.text }]}
            placeholder="Enter wallet address"
            placeholderTextColor={colors.tertiaryText}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
          />
          <View style={styles.addressInputActions}>
            <TouchableOpacity
              style={styles.addressInputActionButton}
              onPress={handlePasteAddress}>
              <Ionicons
                name="clipboard-outline"
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addressInputActionButton}
              onPress={navigateToScanner}>
              <Ionicons name="scan-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.addressHelpText, { color: colors.secondaryText }]}>
          Double check the address to ensure you're sending to the correct
          recipient.
        </Text>

        {detectedAddressType && (
          <View
            style={[
              styles.detectedAddressBox,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
                borderWidth: 1,
              },
            ]}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[styles.detectedAddressText, { color: colors.primary }]}>
              {detectedAddressType === "SOLANA"
                ? "Solana address detected"
                : "Ethereum compatible address detected"}
            </Text>
          </View>
        )}

        <AddressValidation
          address={recipientAddress}
          chainName={selectedChain?.name || ""}
          isValid={isAddressValid}
          isValidating={isValidatingAddress}
        />
      </View>
    );
  };

  // Render chain select screen (after recipient screen when EVM address is detected)
  const renderChainSelectScreen = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Select Blockchain
        </Text>
        <Text style={[styles.stepDescription, { color: colors.secondaryText }]}>
          Choose the blockchain network for this Ethereum address
        </Text>

        <View style={styles.chainListContainer}>
          {CHAINS.filter((chain) => chain.is_evm).map((chain) => {
            const isEnabled = hasEVMAccount;

            return (
              <TouchableOpacity
                key={chain.id}
                style={[
                  styles.chainItem,
                  {
                    backgroundColor:
                      selectedChain?.id === chain.id
                        ? colors.primaryLight
                        : theme === "dark"
                          ? colors.card
                          : "#FFFFFF",
                    borderColor:
                      selectedChain?.id === chain.id
                        ? colors.primary
                        : colors.border,
                    opacity: isEnabled ? 1 : 0.5,
                  },
                ]}
                onPress={() => {
                  if (isEnabled) {
                    Haptics.selectionAsync();
                    setSelectedChain(chain);
                  } else {
                    Alert.alert(
                      "Account Required",
                      `You don't have an Ethereum account set up in this wallet.`,
                    );
                  }
                }}
                disabled={!isEnabled}>
                <View style={styles.chainIconContainer}>
                  <chain.icon width={24} height={24} />
                </View>
                <Text style={[styles.chainName, { color: colors.text }]}>
                  {chain.name}
                </Text>
                {selectedChain?.id === chain.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Render token selection screen
  const renderTokenSelectScreen = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Select Token
        </Text>
        <Text style={[styles.stepDescription, { color: colors.secondaryText }]}>
          Choose which token you want to send
        </Text>

        <View style={styles.chainBadge}>
          <View style={styles.chainBadgeIconContainer}>
            {selectedChain && <selectedChain.icon width={16} height={16} />}
          </View>
          <Text style={[styles.chainBadgeText, { color: colors.text }]}>
            {selectedChain?.name}
          </Text>
        </View>

        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor:
                theme === "dark" ? colors.inputBackground : colors.surface,
            },
          ]}>
          <Ionicons name="search" size={20} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tokens"
            placeholderTextColor={colors.tertiaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        {loadingTokens ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
              Loading tokens...
            </Text>
          </View>
        ) : filteredTokens.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons
              name="wallet-outline"
              size={48}
              color={colors.secondaryText}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.secondaryText }]}>
              {searchQuery
                ? `No tokens found matching "${searchQuery}"`
                : `No tokens found for ${selectedChain?.name}`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTokens}
            keyExtractor={(item, index) => `${item.data.chain.id}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tokenItem,
                  {
                    backgroundColor:
                      selectedToken?.data.symbol === item.data.symbol
                        ? colors.primaryLight
                        : theme === "dark"
                          ? colors.card
                          : "#FFFFFF",
                    borderColor:
                      selectedToken?.data.symbol === item.data.symbol
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedToken(item);
                }}>
                <View style={styles.tokenIconContainer}>
                  {item.data.logoUri ? (
                    <Image
                      source={{ uri: getTokenLogoUri(item) }}
                      style={styles.tokenIcon}
                      onError={() => {}}
                    />
                  ) : (
                    <TokenPlaceholderIcon
                      width={40}
                      height={40}
                      symbol={item.data.symbol}
                    />
                  )}
                </View>
                <View style={styles.tokenDetails}>
                  <Text style={[styles.tokenName, { color: colors.text }]}>
                    {item.data.name}
                  </Text>
                  <Text
                    style={[
                      styles.tokenSymbol,
                      { color: colors.secondaryText },
                    ]}>
                    {item.data.symbol}
                  </Text>
                </View>
                <View style={styles.tokenBalanceContainer}>
                  <Text style={[styles.tokenBalance, { color: colors.text }]}>
                    {formatTokenAmount(item.data.amount, item.data.decimals)}
                  </Text>
                  <Text
                    style={[
                      styles.tokenValue,
                      { color: colors.secondaryText },
                    ]}>
                    {formatUsdValue(item.usdValue)}
                  </Text>
                </View>
                {selectedToken?.data.symbol === item.data.symbol && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tokenList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  // Render amount input screen with real-time USD value
  const renderAmountScreen = () => {
    const maxAmount = calculateMaxAmount();

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Enter Amount
        </Text>
        <Text style={[styles.stepDescription, { color: colors.secondaryText }]}>
          Enter the amount of {selectedToken?.data.symbol} to send
        </Text>

        <View style={styles.selectedTokenContainer}>
          <View style={styles.selectedTokenIconContainer}>
            {selectedToken?.data.logoUri ? (
              <Image
                source={{ uri: getTokenLogoUri(selectedToken) }}
                style={styles.selectedTokenIcon}
                onError={() => {}}
              />
            ) : (
              <TokenPlaceholderIcon
                width={32}
                height={32}
                symbol={selectedToken?.data.symbol || "?"}
              />
            )}
          </View>
          <View style={styles.selectedTokenDetails}>
            <Text style={[styles.selectedTokenName, { color: colors.text }]}>
              {selectedToken?.data.name}
            </Text>
            <Text
              style={[
                styles.selectedTokenSymbol,
                { color: colors.secondaryText },
              ]}>
              {selectedToken?.data.symbol}
            </Text>
          </View>
          <View style={styles.selectedTokenBalanceContainer}>
            <Text style={[styles.selectedTokenBalance, { color: colors.text }]}>
              Balance: {maxAmount} {selectedToken?.data.symbol}
            </Text>
          </View>
        </View>

        <View style={styles.amountInputContainer}>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="0.0"
            placeholderTextColor={colors.tertiaryText}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.maxButton, { backgroundColor: colors.primaryLight }]}
            onPress={handleSetMaxAmount}>
            <Text style={[styles.maxButtonText, { color: colors.primary }]}>
              MAX
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.amountInUsd, { color: colors.secondaryText }]}>
          ≈ {formatUsdValue(tokenUsdValue)}
        </Text>
      </View>
    );
  };

  // Render confirmation screen
  const renderConfirmScreen = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Confirm Transaction
        </Text>
        <Text style={[styles.stepDescription, { color: colors.secondaryText }]}>
          Review the transaction details before sending
        </Text>

        <View
          style={[
            styles.confirmationCard,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.confirmationRow}>
            <Text
              style={[
                styles.confirmationLabel,
                { color: colors.secondaryText },
              ]}>
              From
            </Text>
            <Text style={[styles.confirmationValue, { color: colors.text }]}>
              Your {selectedChain?.name} Wallet
            </Text>
          </View>

          <View style={styles.confirmationRow}>
            <Text
              style={[
                styles.confirmationLabel,
                { color: colors.secondaryText },
              ]}>
              To
            </Text>
            <Text
              style={[styles.confirmationValue, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {recipientAddress}
            </Text>
          </View>

          <View style={styles.confirmationRow}>
            <Text
              style={[
                styles.confirmationLabel,
                { color: colors.secondaryText },
              ]}>
              Amount
            </Text>
            <View style={styles.confirmationAmountContainer}>
              <View style={styles.tokenIconSmallContainer}>
                {selectedToken?.data.logoUri ? (
                  <Image
                    source={{ uri: getTokenLogoUri(selectedToken) }}
                    style={styles.tokenIconSmall}
                    onError={() => {}}
                  />
                ) : (
                  <TokenPlaceholderIcon
                    width={16}
                    height={16}
                    symbol={selectedToken?.data.symbol || "?"}
                  />
                )}
              </View>
              <Text style={[styles.confirmationValue, { color: colors.text }]}>
                {amount} {selectedToken?.data.symbol}
              </Text>
            </View>
          </View>

          <View style={styles.confirmationRow}>
            <Text
              style={[
                styles.confirmationLabel,
                { color: colors.secondaryText },
              ]}>
              Network
            </Text>
            <View style={styles.confirmationNetworkContainer}>
              <View style={styles.chainIconSmallContainer}>
                {selectedChain && <selectedChain.icon width={16} height={16} />}
              </View>
              <Text style={[styles.confirmationValue, { color: colors.text }]}>
                {selectedChain?.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Fee Information Display */}
        <FeeInfoDisplay
          feeInfo={feeInfo}
          isLoading={estimatingFee}
          chainId={selectedChain?.id || ""}
          error={error}
        />
      </View>
    );
  };

  // Render transaction result screen
  const renderResultScreen = () => {
    const isSuccessful = transactionResult && transactionResult.status;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.resultIconContainer}>
          {isSuccessful ? (
            <SuccessAnimation size={80} />
          ) : (
            <View
              style={[
                styles.errorIconCircle,
                { backgroundColor: colors.error + "20" },
              ]}>
              <Ionicons name="close" size={48} color={colors.error} />
            </View>
          )}
        </View>

        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {isSuccessful ? "Transaction Successful" : "Transaction Failed"}
        </Text>

        <Text
          style={[styles.resultDescription, { color: colors.secondaryText }]}>
          {isSuccessful
            ? `You've successfully sent ${amount} ${selectedToken?.data.symbol} to ${recipientAddress.substring(0, 8)}...${recipientAddress.substring(recipientAddress.length - 6)}`
            : `There was an error while trying to send ${amount} ${selectedToken?.data.symbol}`}
        </Text>

        {transactionResult?.hash && (
          <TouchableOpacity
            style={[
              styles.viewExplorerButton,
              { backgroundColor: colors.primaryLight },
            ]}
            onPress={openTransactionInExplorer}>
            <Text
              style={[
                styles.viewExplorerButtonText,
                { color: colors.primary },
              ]}>
              View in Explorer
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {!isSuccessful && transactionResult?.error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.error}
            />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {transactionResult.error}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Get step title for the header
  const getStepTitle = () => {
    switch (currentStep) {
      case SendStep.RECIPIENT:
        return "Send Tokens";
      case SendStep.CHAIN_SELECT:
        return "Select Chain";
      case SendStep.TOKEN_SELECT:
        return "Select Token";
      case SendStep.AMOUNT:
        return "Enter Amount";
      case SendStep.CONFIRM:
        return "Confirm Transaction";
      case SendStep.RESULT:
        return "Transaction Result";
      default:
        return "Send";
    }
  };

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case SendStep.RECIPIENT:
        return renderRecipientScreen();
      case SendStep.CHAIN_SELECT:
        return renderChainSelectScreen();
      case SendStep.TOKEN_SELECT:
        return renderTokenSelectScreen();
      case SendStep.AMOUNT:
        return renderAmountScreen();
      case SendStep.CONFIRM:
        return renderConfirmScreen();
      case SendStep.RESULT:
        return renderResultScreen();
      default:
        return null;
    }
  };

  // Main render function
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {getStepTitle()}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Step Progress Indicator */}
        <View style={styles.stepIndicatorContainer}>
          {Object.values(SendStep).map((step, index) => (
            <View
              key={step}
              style={[
                styles.stepIndicator,
                {
                  backgroundColor:
                    Object.values(SendStep).indexOf(currentStep) >= index
                      ? colors.primary
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Main Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
              Loading wallet data...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled">
            {renderStepContent()}
          </ScrollView>
        )}

        {/* Continue Button */}
        {!loading && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  backgroundColor:
                    (currentStep === SendStep.RECIPIENT &&
                      !detectedAddressType) ||
                    estimatingFee ||
                    processingTransaction
                      ? colors.disabledButton
                      : colors.primary,
                },
              ]}
              onPress={handleNext}
              disabled={
                (currentStep === SendStep.RECIPIENT && !detectedAddressType) ||
                estimatingFee ||
                processingTransaction
              }>
              {estimatingFee || processingTransaction ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>{getButtonText()}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Chain Selection Dropdown Modal */}
        <Modal
          transparent={true}
          visible={chainDropdownVisible}
          animationType="fade"
          onRequestClose={() => setChainDropdownVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setChainDropdownVisible(false)}>
            <View
              style={[
                styles.chainDropdown,
                {
                  backgroundColor: theme === "dark" ? colors.card : "#FFFFFF",
                },
              ]}>
              {CHAINS.map((chain) => {
                const isEnabled =
                  (chain.is_evm && hasEVMAccount) ||
                  (!chain.is_evm && hasSVMAccount);

                return (
                  <TouchableOpacity
                    key={chain.id}
                    style={[
                      styles.chainDropdownItem,
                      {
                        backgroundColor:
                          selectedChain?.id === chain.id
                            ? colors.primaryLight
                            : "transparent",
                        opacity: isEnabled ? 1 : 0.5,
                      },
                    ]}
                    onPress={() => {
                      if (isEnabled) {
                        Haptics.selectionAsync();
                        setSelectedChain(chain);
                        setChainDropdownVisible(false);
                      } else {
                        Alert.alert(
                          "Account Required",
                          `You don't have a ${chain.name} account set up in this wallet.`,
                        );
                      }
                    }}
                    disabled={!isEnabled}>
                    <View style={styles.chainIconContainer}>
                      <chain.icon width={24} height={24} />
                    </View>
                    <Text style={[styles.chainName, { color: colors.text }]}>
                      {chain.name}
                    </Text>
                    {selectedChain?.id === chain.id && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Show cross-chain warning if applicable */}
        {showChainMismatchWarning && detectedChainId && selectedChain && (
          <CrossChainWarning
            detectedChain={detectedChainId}
            selectedChain={selectedChain.id}
            onDismiss={dismissChainMismatchWarning}
            onSwitch={switchToDetectedChain}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  stepContainer: {
    paddingVertical: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 24,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "transparent",
  },
  continueButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  chainListContainer: {
    marginTop: 8,
  },
  chainItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  chainIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chainName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  chainDropdown: {
    width: "80%",
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chainDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  detectedAddressBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  detectedAddressText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Recipient Styles
  chainBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  chainBadgeIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  chainBadgeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  addressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  addressInputActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressInputActionButton: {
    padding: 8,
  },
  addressHelpText: {
    fontSize: 14,
    marginTop: 8,
  },

  // Token Select Styles
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  tokenList: {
    paddingBottom: 20,
  },
  tokenItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  tokenIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenDetails: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "500",
  },
  tokenSymbol: {
    fontSize: 14,
  },
  tokenBalanceContainer: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  tokenBalance: {
    fontSize: 16,
    fontWeight: "500",
  },
  tokenValue: {
    fontSize: 14,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },

  // Amount Screen Styles
  selectedTokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  selectedTokenIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedTokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedTokenDetails: {
    flex: 1,
  },
  selectedTokenName: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectedTokenSymbol: {
    fontSize: 14,
  },
  selectedTokenBalanceContainer: {
    alignItems: "flex-end",
  },
  selectedTokenBalance: {
    fontSize: 14,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "bold",
    padding: 0,
  },
  maxButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  amountInUsd: {
    fontSize: 16,
    marginBottom: 24,
  },

  // Confirmation Screen Styles
  confirmationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  confirmationLabel: {
    fontSize: 14,
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
  },
  confirmationAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenIconSmallContainer: {
    marginRight: 8,
  },
  tokenIconSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  confirmationNetworkContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  chainIconSmallContainer: {
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
  },

  // Result Screen Styles
  resultIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  resultDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  viewExplorerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  viewExplorerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
});
