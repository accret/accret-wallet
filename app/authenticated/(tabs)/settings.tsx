import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentAccount } from "@/lib/accountStorage";
import type { AccountStorage } from "@/types/accountStorage";
import ScreenHeader from "../ScreenHeader";

export default function SettingsScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [currentAccount, setCurrentAccount] = useState<AccountStorage | null>(
    null,
  );

  useEffect(() => {
    const loadAccount = async () => {
      const account = await getCurrentAccount();
      setCurrentAccount(account);
    };
    loadAccount();
  }, []);

  const navigateToAccountSettings = () => {
    router.push("/authenticated/account-settings");
  };

  const navigateToSecuritySettings = () => {
    router.push("/authenticated/security-settings");
  };

  const getWalletInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={icon as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.settingsItemTextContainer}>
          <Text style={[styles.settingsItemTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.settingsItemSubtitle,
                { color: colors.secondaryText },
              ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.tertiaryText} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}>
        {/* User Profile */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {currentAccount ? (
                <Text style={styles.avatarText}>
                  {getWalletInitials(currentAccount.userAccountName)}
                </Text>
              ) : (
                <Ionicons name="person" size={32} color="white" />
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {currentAccount?.userAccountName || "Guest"}
              </Text>
              <Text
                style={[styles.userSubtitle, { color: colors.secondaryText }]}>
                {currentAccount ? "Wallet connected" : "No wallet connected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme === "dark" ? colors.card : "#FFFFFF" },
          ]}>
          <SettingsItem
            icon="wallet-outline"
            title="Account Settings"
            subtitle="Manage your wallets and accounts"
            onPress={navigateToAccountSettings}
          />
          <SettingsItem
            icon="lock-closed-outline"
            title="Security Settings"
            subtitle="Configure biometric authentication"
            onPress={navigateToSecuritySettings}
          />
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.tertiaryText }]}>
            Accret Wallet v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileCard: {
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsItemTextContainer: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingsItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
});
