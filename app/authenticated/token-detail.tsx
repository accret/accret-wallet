import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { TokenPlaceholderIcon } from "@/icons";
import { formatTokenAmount } from "@/lib/api/portfolioUtils";
import fetchTokenInfo from "@/lib/api/tokenInfo";
import fetchPriceHistory from "@/lib/api/priceHistory";
import type { TokenInfoSuccess } from "@/types/tokenInfo";
import { LineChart } from "react-native-wagmi-charts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TIME_PERIODS = [
  { label: "1H", value: "1H" },
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "YTD", value: "YTD" },
  { label: "ALL", value: "ALL" },
];

// Improved function to format USD value with consistent B, M, K abbreviations
const formatUsdPrice = (value: number): string => {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value > 0) {
    return `$${value.toFixed(4)}`;
  }
  return "$0.00";
};

// Fixed formatter for chart display to ensure it never returns "..."
const formatPriceForChart = (value: number): string => {
  if (isNaN(value)) return "$0.00";

  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}`;
  } else if (value > 0) {
    return `$${value.toFixed(4)}`;
  }
  return "$0.00";
};

// Format number with abbreviations
const formatNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toLocaleString();
};

// Format date in a consistent way
const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

export default function TokenDetailScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoSuccess | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Chart state with correct typing
  const [chartData, setChartData] = useState<
    { timestamp: number; value: number }[]
  >([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("1D");
  const [isPriceIncreasing, setIsPriceIncreasing] = useState(true);

  // Current price from chart data (most recent value)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);

  // Get params from navigation
  const network = params.network as string;
  const tokenAddress = params.tokenAddress as string;
  const tokenName = params.name as string;
  const tokenSymbol = params.symbol as string;
  const tokenLogo = params.logo as string;
  const tokenAmount = params.amount as string;
  const tokenDecimals = params.decimals
    ? parseInt(params.decimals as string)
    : 0;
  const tokenPrice = params.price ? parseFloat(params.price as string) : 0;
  const tokenPriceChange = params.priceChange
    ? parseFloat(params.priceChange as string)
    : 0;
  const tokenValue = params.value ? parseFloat(params.value as string) : 0;

  useEffect(() => {
    fetchTokenDetails();
  }, [network, tokenAddress]);

  useEffect(() => {
    fetchChartData();
  }, [network, tokenAddress, selectedTimeRange]);

  // Update current price whenever chart data changes
  useEffect(() => {
    if (chartData.length > 0) {
      // Get the most recent price
      const latestPriceData = chartData[chartData.length - 1];
      setCurrentPrice(latestPriceData.value);
      setLastUpdated(new Date(latestPriceData.timestamp));

      // Calculate min and max values for better display
      const values = chartData.map((item) => item.value);
      setMinValue(Math.min(...values));
      setMaxValue(Math.max(...values));
    }
  }, [chartData]);

  // Determine if the chart is trending up or down
  const determineChartTrend = (
    data: { timestamp: number; value: number }[],
  ) => {
    if (data.length < 2) return true;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    return lastValue >= firstValue;
  };

  // Chart color based on price trend
  const chartColor = useMemo(() => {
    return isPriceIncreasing ? colors.success : colors.error;
  }, [isPriceIncreasing, colors.success, colors.error]);

  const fetchTokenDetails = async () => {
    if (!network || !tokenAddress) {
      setError("Invalid token parameters");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchTokenInfo(network as any, tokenAddress);

      // Check if the response is a success
      if ("data" in response) {
        setTokenInfo(response);
      } else {
        setError(response.message || "Failed to fetch token information");
      }
    } catch (err) {
      setError("An error occurred while fetching token details");
      console.error("Token info fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    if (!network || !tokenAddress) {
      setChartError("Invalid token parameters");
      setChartLoading(false);
      return;
    }

    try {
      setChartLoading(true);
      setRefreshing(true);

      const response = await fetchPriceHistory(
        network as any,
        tokenAddress,
        selectedTimeRange as any,
      );

      // Transform price history data into format expected by the chart
      if ("history" in response) {
        const formattedData = response.history.map((dataPoint) => ({
          timestamp: dataPoint.unixTime * 1000, // Convert to milliseconds for JS Date
          value: parseFloat(dataPoint.value),
        }));

        // Ensure data is sorted by timestamp
        formattedData.sort((a, b) => a.timestamp - b.timestamp);

        setChartData(formattedData);
        // Determine if price is trending up or down for this time period
        setIsPriceIncreasing(determineChartTrend(formattedData));
        setChartError(null);
      } else {
        setChartError(response.message || "Failed to fetch price history");
        setChartData([]);
      }
    } catch (err) {
      setChartError("An error occurred while fetching price history");
      console.error("Price history fetch error:", err);
      setChartData([]);
    } finally {
      setChartLoading(false);
      setRefreshing(false);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopiedText(label);

      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
    } catch (err) {
      console.error("Copy to clipboard error:", err);
    }
  };

  const handleOpenLink = async (url: string) => {
    // Check if URL has a valid scheme, if not add https://
    const validUrl = url.startsWith("http") ? url : `https://${url}`;

    try {
      await WebBrowser.openBrowserAsync(validUrl);
    } catch (err) {
      console.error("Open URL error:", err);
      Alert.alert("Error", "Failed to open the URL");
    }
  };

  const handleTimeRangeSelect = (timeRange: string) => {
    Haptics.selectionAsync();
    setSelectedTimeRange(timeRange);
  };

  // Handle refresh button press
  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchChartData();
  };

  // Handle haptic feedback for chart interaction
  const handleChartHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Calculating if price change is positive, negative, or neutral
  const priceChangeColor =
    tokenPriceChange > 0
      ? colors.success
      : tokenPriceChange < 0
        ? colors.error
        : colors.tertiaryText;

  // Format price change with sign
  const formattedPriceChange =
    tokenPriceChange > 0
      ? `+${tokenPriceChange.toFixed(2)}%`
      : tokenPriceChange < 0
        ? `${tokenPriceChange.toFixed(2)}%`
        : "0.00%";

  // Handle errors with image loading
  const [imageError, setImageError] = useState(false);

  // Handle Polygon logo URL specifically
  const getLogoUri = (logoUrl: string | undefined) => {
    if (!logoUrl) return undefined;

    // Check if it's the problematic Polygon URL
    if (logoUrl === "https://wallet-asset.matic.network/img/tokens/matic.svg") {
      return "https://dhc7eusqrdwa0.cloudfront.net/assets/polygon.png";
    }
    return logoUrl;
  };

  // Format the last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return "";
    return formatDateTime(lastUpdated.getTime());
  };

  // Get first and last date for range display
  const getDateRangeText = () => {
    if (chartData.length < 2) return "";

    const firstDate = new Date(chartData[0].timestamp);
    const lastDate = new Date(chartData[chartData.length - 1].timestamp);

    return `${formatDateTime(firstDate.getTime())} - ${formatDateTime(lastDate.getTime())}`;
  };

  // Render time period selector
  const renderTimePeriodSelector = () => {
    return (
      <View style={styles.timePeriodSelector}>
        {TIME_PERIODS.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.timePeriodButton,
              selectedTimeRange === period.value && [
                styles.activeTabOption,
                {
                  backgroundColor:
                    theme === "dark"
                      ? colors.primary + "30"
                      : colors.primary + "20",
                  borderColor: colors.primary,
                },
              ],
            ]}
            onPress={() => handleTimeRangeSelect(period.value)}>
            <Text
              style={[
                styles.timePeriodText,
                {
                  color:
                    selectedTimeRange === period.value
                      ? colors.primary
                      : colors.secondaryText,
                },
              ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render the price chart
  const renderPriceChart = () => {
    if (chartLoading) {
      return (
        <View style={styles.chartLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading price data...
          </Text>
        </View>
      );
    }

    if (chartError || chartData.length === 0) {
      return (
        <View style={styles.chartErrorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={24}
            color={colors.secondaryText}
          />
          <Text
            style={[styles.chartErrorText, { color: colors.secondaryText }]}>
            {chartError || "No price data available"}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchChartData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        {/* Current Price Display (when not interacting with chart) */}
        <View style={styles.currentPriceContainer}>
          <View>
            <Text style={[styles.currentPriceValue, { color: colors.text }]}>
              {currentPrice
                ? formatPriceForChart(currentPrice)
                : formatPriceForChart(tokenPrice)}
            </Text>
            <Text
              style={[
                styles.currentPriceLabel,
                { color: colors.secondaryText },
              ]}>
              Last updated: {getLastUpdatedText()}
            </Text>
          </View>
        </View>

        {chartData.length > 0 && (
          <View style={styles.chartBox}>
            <LineChart.Provider data={chartData}>
              <LineChart height={200} width={SCREEN_WIDTH - 48}>
                <LineChart.Path color={chartColor}>
                  <LineChart.Gradient color={chartColor} />
                </LineChart.Path>
                <LineChart.CursorCrosshair
                  color={chartColor}
                  onActivated={handleChartHaptic}
                  onEnded={handleChartHaptic}>
                  <LineChart.Tooltip
                    textStyle={{
                      backgroundColor:
                        theme === "dark" ? colors.card : "#FFFFFF",
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "bold",
                      padding: 6,
                      paddingHorizontal: 10,
                    }}
                  />
                </LineChart.CursorCrosshair>
              </LineChart>

              <View style={styles.chartLabelsContainer}>
                <LineChart.PriceText
                  precision={4}
                  format={({ value }) => {
                    "worklet";
                    if (
                      value === undefined ||
                      value === null ||
                      isNaN(parseFloat(String(value)))
                    ) {
                      return "$0.00";
                    }

                    const numValue = parseFloat(String(value));
                    if (numValue >= 1000000000) {
                      return `$${(numValue / 1000000000).toFixed(2)}B`;
                    } else if (numValue >= 1000000) {
                      return `$${(numValue / 1000000).toFixed(2)}M`;
                    } else if (numValue >= 1000) {
                      return `$${(numValue / 1000).toFixed(2)}K`;
                    } else if (numValue >= 1) {
                      return `$${numValue.toFixed(2)}`;
                    } else if (numValue > 0) {
                      return `$${numValue.toFixed(4)}`;
                    }
                    return "$0.00";
                  }}
                  style={[styles.priceLabel, { color: colors.text }]}
                />
                <LineChart.DatetimeText
                  format={({ value }) => {
                    "worklet";
                    if (!value) return "";
                    try {
                      const date = new Date(value);
                      return date.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      });
                    } catch (e) {
                      console.log(e);
                      return "";
                    }
                  }}
                  style={[
                    styles.dateTimeLabel,
                    { color: colors.secondaryText },
                  ]}
                />
              </View>
            </LineChart.Provider>
          </View>
        )}

        {/* Min/Max Range Display */}
        <View style={styles.priceRangeContainer}>
          <Text
            style={[styles.priceRangeText, { color: colors.secondaryText }]}>
            {minValue ? formatPriceForChart(minValue) : "$0.00"}
          </Text>
          <Text
            style={[styles.priceRangeText, { color: colors.secondaryText }]}>
            {maxValue ? formatPriceForChart(maxValue) : "$0.00"}
          </Text>
        </View>

        {/* Date Range Display */}
        <Text style={[styles.dateRangeText, { color: colors.secondaryText }]}>
          {getDateRangeText()}
        </Text>
      </View>
    );
  };

  // Render Token Basic Info component
  const renderTokenBasicInfo = () => {
    // Calculate current token value based on current price
    const calculatedTokenValue = currentPrice
      ? parseFloat(formatTokenAmount(tokenAmount || "0", tokenDecimals)) *
        currentPrice
      : tokenValue;

    return (
      <View style={[styles.tokenBasicInfo, { backgroundColor: colors.card }]}>
        <View style={styles.tokenHeader}>
          <View style={styles.tokenLogoContainer}>
            {tokenLogo && !imageError ? (
              <Image
                source={{ uri: getLogoUri(tokenLogo) }}
                style={styles.tokenLogo}
                onError={() => setImageError(true)}
              />
            ) : (
              <TokenPlaceholderIcon
                width={64}
                height={64}
                symbol={tokenSymbol || "??"}
              />
            )}
          </View>

          <View style={styles.tokenHeaderInfo}>
            <Text style={[styles.tokenName, { color: colors.text }]}>
              {tokenName || "Unknown Token"}
            </Text>
            <Text style={[styles.tokenSymbol, { color: colors.secondaryText }]}>
              {tokenSymbol || "???"}
            </Text>

            <View style={styles.tokenPriceContainer}>
              <Text style={[styles.tokenPrice, { color: colors.text }]}>
                {currentPrice
                  ? formatUsdPrice(currentPrice)
                  : formatUsdPrice(tokenPrice)}
              </Text>
              <Text
                style={[styles.priceChangeSmall, { color: priceChangeColor }]}>
                {formattedPriceChange}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tokenBalanceContainer}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>
            Your Balance
          </Text>
          <Text style={[styles.tokenBalance, { color: colors.text }]}>
            {formatTokenAmount(tokenAmount || "0", tokenDecimals)} {tokenSymbol}
          </Text>
          <Text style={[styles.tokenValue, { color: colors.secondaryText }]}>
            {formatUsdPrice(calculatedTokenValue)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {tokenName || "Token Details"}
        </Text>
        <View style={styles.placeholderButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading token details...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchTokenDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {/* Chart Container - Now at the top */}
          <View style={[styles.chartWrapper, { backgroundColor: colors.card }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Price Chart
              </Text>
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                style={styles.refreshButton}>
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {renderTimePeriodSelector()}
            {renderPriceChart()}
          </View>

          {/* Token Basic Info */}
          {renderTokenBasicInfo()}

          {/* Token Details */}
          <View
            style={[styles.detailsContainer, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Token Details
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.secondaryText }]}>
                Network
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {tokenInfo?.data.chain.name || "Unknown"}
              </Text>
            </View>

            <View
              style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text
                style={[styles.detailLabel, { color: colors.secondaryText }]}>
                Token Address
              </Text>
              <View style={styles.addressContainer}>
                <Text
                  style={[styles.addressText, { color: colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="middle">
                  {tokenAddress}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() =>
                    handleCopyToClipboard(tokenAddress, "address")
                  }>
                  <Ionicons
                    name={
                      copiedText === "address" ? "checkmark" : "copy-outline"
                    }
                    size={16}
                    color={
                      copiedText === "address" ? colors.success : colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.secondaryText }]}>
                Decimals
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {tokenDecimals}
              </Text>
            </View>

            {tokenInfo?.data.totalSupply && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.secondaryText }]}>
                  Total Supply
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatNumber(parseFloat(tokenInfo.data.totalSupply))}
                </Text>
              </View>
            )}

            {tokenInfo?.data.spamStatus && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.secondaryText }]}>
                  Verification Status
                </Text>
                <View style={styles.verificationContainer}>
                  <View
                    style={[
                      styles.verificationBadge,
                      {
                        backgroundColor:
                          tokenInfo.data.spamStatus === "VERIFIED"
                            ? colors.success + "20"
                            : tokenInfo.data.spamStatus === "POSSIBLE_SPAM"
                              ? colors.error + "20"
                              : colors.tertiaryText + "20",
                      },
                    ]}>
                    <Text
                      style={[
                        styles.verificationText,
                        {
                          color:
                            tokenInfo.data.spamStatus === "VERIFIED"
                              ? colors.success
                              : tokenInfo.data.spamStatus === "POSSIBLE_SPAM"
                                ? colors.error
                                : colors.tertiaryText,
                        },
                      ]}>
                      {tokenInfo.data.spamStatus.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Market Stats */}
          {tokenInfo?.data && (
            <View
              style={[styles.statsContainer, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Market Stats
                </Text>
              </View>

              {tokenInfo.data.marketCap && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Market Cap
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatUsdPrice(parseFloat(tokenInfo.data.marketCap))}
                  </Text>
                </View>
              )}

              {tokenInfo.data.volume24hUSD !== undefined && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    24h Volume
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatUsdPrice(tokenInfo.data.volume24hUSD)}
                  </Text>
                </View>
              )}

              {tokenInfo.data.trades24h !== undefined && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    24h Trades
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatNumber(tokenInfo.data.trades24h)}
                  </Text>
                </View>
              )}

              {tokenInfo.data.uniqueWallets24h !== undefined && (
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.secondaryText },
                    ]}>
                    Unique Wallets (24h)
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatNumber(tokenInfo.data.uniqueWallets24h)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Links Section */}
          {tokenInfo?.data.links && tokenInfo.data.links.length > 0 && (
            <View
              style={[styles.linksContainer, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Links
                </Text>
              </View>

              {tokenInfo.data.links.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.linkRow,
                    index === tokenInfo.data.links.length - 1
                      ? { borderBottomWidth: 0 }
                      : null,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleOpenLink(link.url)}>
                  <Text style={[styles.linkType, { color: colors.text }]}>
                    {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                  </Text>
                  <View style={styles.linkUrlContainer}>
                    <Text
                      style={[styles.linkUrl, { color: colors.primary }]}
                      numberOfLines={1}
                      ellipsizeMode="middle">
                      {link.url}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          {tokenInfo?.data.description && (
            <View
              style={[
                styles.descriptionContainer,
                { backgroundColor: colors.card },
              ]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  About
                </Text>
              </View>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {tokenInfo.data.description}
              </Text>
            </View>
          )}

          {/* Spacer at bottom for better scrolling */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
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
  placeholderButton: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  tokenBasicInfo: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  tokenHeader: {
    flexDirection: "row",
    padding: 16,
  },
  tokenLogoContainer: {
    marginRight: 16,
  },
  tokenLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  tokenHeaderInfo: {
    flex: 1,
    justifyContent: "center",
  },
  tokenName: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 4,
  },
  tokenSymbol: {
    fontSize: 16,
    marginBottom: 8,
  },
  tokenPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tokenPrice: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: "500",
  },
  priceChangeSmall: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  tokenBalanceContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  tokenBalance: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 14,
  },
  chartWrapper: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    paddingBottom: 20,
  },
  chartContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  chartBox: {
    marginVertical: 8,
    paddingVertical: 8,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  currentPriceContainer: {
    marginVertical: 12,
    marginHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentPriceValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  currentPriceLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  priceRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  priceRangeText: {
    fontSize: 12,
  },
  dateRangeText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  chartErrorContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  chartErrorText: {
    fontSize: 14,
    marginVertical: 8,
    textAlign: "center",
  },
  timePeriodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  timePeriodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timePeriodText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabOption: {
    // Will be set dynamically
  },
  chartLabelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  detailsContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  addressText: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "80%",
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  verificationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  verificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  linksContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  linkType: {
    fontSize: 14,
    fontWeight: "500",
  },
  linkUrlContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkUrl: {
    fontSize: 14,
    marginRight: 4,
    maxWidth: 200,
  },
  descriptionContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  bottomSpacer: {
    height: 40,
  },
});
