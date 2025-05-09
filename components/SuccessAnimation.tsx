import React, { useEffect } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

interface SuccessAnimationProps {
  size?: number;
}

export default function SuccessAnimation({ size = 80 }: SuccessAnimationProps) {
  const { colors } = useTheme();
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    // Start animation sequence
    Animated.sequence([
      // First fade in and scale up
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Then scale down to normal size
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circleBackground,
          {
            backgroundColor: colors.success + "20",
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}>
        <Ionicons name="checkmark" size={size * 0.6} color={colors.success} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleBackground: {
    alignItems: "center",
    justifyContent: "center",
  },
});
