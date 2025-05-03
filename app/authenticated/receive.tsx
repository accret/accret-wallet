import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Share,
  Modal,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { StatusBar } from "expo-status-bar";
import QRCode from "react-native-qrcode-svg";
import {
  useCurrentSVMAccount,
  useCurrentEVMAccount,
  useCurrentAccount,
} from "@/lib/accountStorage";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ReceiveScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SVM" | "EVM">("SVM");
  const [svmAccount, setSvmAccount] = useState<any>(null);
  const [evmAccount, setEvmAccount] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // Ref for sharing QR code
  const qrCodeRef = useRef<View>(null);

  // Load wallet data
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoading(true);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const svm = await useCurrentSVMAccount();
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const evm = await useCurrentEVMAccount();
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const acc = await useCurrentAccount();

        setSvmAccount(svm);
        setEvmAccount(evm);
        setAccount(acc);
      } catch (error) {
        console.error("Error loading accounts:", error);
        Alert.alert("Error", "Failed to load wallet addresses");
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const getCurrentAddress = () => {
    if (activeTab === "SVM") {
      return svmAccount?.publicKey.toString();
    } else {
      return evmAccount?.publicKey;
    }
  };

  const handleCopyAddress = async () => {
    const address = getCurrentAddress();
    if (address) {
      try {
        await Clipboard.setStringAsync(address);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Error copying address:", error);
      }
    }
  };

  const handleShare = async () => {
    const address = getCurrentAddress();
    if (address) {
      try {
        const chain = activeTab === "SVM" ? "Solana" : "Ethereum";
        await Share.share({
          message: `My ${chain} wallet address: ${address}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Error sharing address:", error);
      }
    }
  };

  const openQRModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQrModalVisible(true);
  };

  const closeQRModal = () => {
    setQrModalVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Receive
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading wallet addresses...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Receive
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View
          style={[styles.infoBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            Share this QR code or your wallet address with others to receive
            payments.
          </Text>
        </View>

        {/* Tab selector for SVM/EVM */}
        <View
          style={[
            styles.tabSelector,
            { backgroundColor: theme === "dark" ? colors.card : "#F1F1F1" },
          ]}>
          <TouchableOpacity
            style={[
              styles.tabOption,
              activeTab === "SVM" && [
                styles.activeTabOption,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab("SVM")}>
            <Text
              style={[
                styles.tabOptionText,
                {
                  color: activeTab === "SVM" ? "#FFFFFF" : colors.secondaryText,
                },
              ]}>
              Solana (SVM)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabOption,
              activeTab === "EVM" && [
                styles.activeTabOption,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab("EVM")}>
            <Text
              style={[
                styles.tabOptionText,
                {
                  color: activeTab === "EVM" ? "#FFFFFF" : colors.secondaryText,
                },
              ]}>
              Ethereum (EVM)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.qrContainer, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.networkBadge,
              { backgroundColor: colors.primaryLight },
            ]}>
            <View
              style={[styles.networkDot, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.networkText, { color: colors.primary }]}>
              {activeTab === "SVM" ? "Solana Mainnet" : "Ethereum Mainnet"}
            </Text>
          </View>

          {/* Make QR code tappable */}
          <TouchableOpacity
            style={styles.qrWrapper}
            onPress={openQRModal}
            activeOpacity={0.8}
            ref={qrCodeRef}>
            {getCurrentAddress() ? (
              <>
                <QRCode
                  value={getCurrentAddress() || ""}
                  size={200}
                  color={colors.text}
                  backgroundColor={colors.card}
                  logoBackgroundColor={colors.card}
                />
                <View style={styles.tapHintContainer}>
                  <Ionicons
                    name="expand-outline"
                    size={16}
                    color={colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.tapHintText,
                      { color: colors.secondaryText },
                    ]}>
                    Tap to enlarge
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noAddressContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.error}
                />
                <Text
                  style={[
                    styles.noAddressText,
                    { color: colors.secondaryText },
                  ]}>
                  No {activeTab} address available
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.scanText, { color: colors.secondaryText }]}>
            {activeTab === "SVM"
              ? "Scan this code to receive SOL or SPL tokens"
              : "Scan this code to receive ETH or ERC-20 tokens"}
          </Text>
        </View>

        <View style={[styles.addressSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.addressLabel, { color: colors.secondaryText }]}>
            Wallet Address
          </Text>
          <View
            style={[
              styles.addressContainer,
              {
                backgroundColor:
                  theme === "dark" ? colors.inputBackground : colors.surface,
              },
            ]}>
            <Text
              style={[styles.addressText, { color: colors.text }]}
              selectable={true}
              numberOfLines={2}>
              {getCurrentAddress()}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleCopyAddress}
              disabled={!getCurrentAddress()}>
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={18}
                color={colors.primary}
              />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleShare}
              disabled={!getCurrentAddress()}>
              <Ionicons
                name="share-social-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.noteText, { color: colors.tertiaryText }]}>
          {activeTab === "SVM"
            ? "Only send Solana or Solana tokens to this address. Sending other cryptocurrencies may result in permanent loss."
            : "Only send Ethereum or ERC-20 tokens to this address. Sending other cryptocurrencies may result in permanent loss."}
        </Text>
      </ScrollView>

      {/* Full-screen QR Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={closeQRModal}>
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0, 0, 0, 0.7)" },
          ]}
          activeOpacity={1}
          onPress={closeQRModal}>
          {/* Stop propagation for the QR code container */}
          <View
            style={[
              styles.fullScreenQrContainer,
              { backgroundColor: colors.card },
            ]}>
            {getCurrentAddress() && (
              <QRCode
                value={getCurrentAddress() || ""}
                size={SCREEN_WIDTH * 0.8}
                color={colors.text}
                backgroundColor={colors.card}
                logoBackgroundColor={colors.card}
              />
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={closeQRModal}>
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
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
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 28,
    marginBottom: 24,
    padding: 4,
  },
  tabOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 24,
  },
  activeTabOption: {
    // backgroundColor set dynamically
  },
  tabOptionText: {
    fontWeight: "600",
  },
  qrContainer: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    position: "absolute",
    top: 12,
    right: 12,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkText: {
    fontSize: 12,
    fontWeight: "500",
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: "center",
  },
  tapHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  tapHintText: {
    fontSize: 12,
    marginLeft: 4,
  },
  scanText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  noAddressContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  noAddressText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: "center",
  },
  addressSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  addressLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  addressContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "SpaceMono",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    width: "48%",
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  noteText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenQrContainer: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    bottom: 60,
    padding: 10,
  },
});
