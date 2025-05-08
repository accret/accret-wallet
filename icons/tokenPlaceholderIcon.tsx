import React from "react";
import { useTheme } from "@/theme";
import Svg, { Circle, Text } from "react-native-svg";

interface TokenPlaceholderIconProps {
  width?: number;
  height?: number;
  symbol?: string;
}

export default function TokenPlaceholderIcon({
  width = 40,
  height = 40,
  symbol = "?",
}: TokenPlaceholderIconProps) {
  const { colors } = useTheme();

  const displayText = symbol ? symbol.substring(0, 1).toUpperCase() : "?";

  // Get appropriate colors based on theme
  const bgColor = colors.primaryLight;
  const textColor = colors.primary;

  return (
    <Svg width={width} height={height} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="20" fill={bgColor} />
      <Text
        x="20"
        y="22"
        fontSize="16"
        fontWeight="bold"
        fill={textColor}
        textAnchor="middle"
        alignmentBaseline="middle">
        {displayText}
      </Text>
    </Svg>
  );
}
