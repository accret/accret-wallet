import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

interface ScreenHeaderProps {
  title: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}

export default function ScreenHeader({
  title,
  leftAction,
  rightAction,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {leftAction ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={leftAction.onPress}>
            <Ionicons
              name={leftAction.icon as any}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>

      <View style={styles.rightContainer}>
        {rightAction ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={rightAction.onPress}>
            <Ionicons
              name={rightAction.icon as any}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  leftContainer: {
    width: 40,
  },
  rightContainer: {
    width: 40,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  spacer: {
    width: 40,
  },
});
