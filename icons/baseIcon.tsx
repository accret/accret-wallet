import React from "react";
import { useTheme } from "@/theme";
import Svg, { Path } from "react-native-svg";

interface BaseIconProps {
  width?: number;
  height?: number;
}

export default function BaseIcon({ width = 196, height = 196 }: BaseIconProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const fill = !isDarkMode ? "#000000" : "#FFFFFF";

  return (
    <Svg width={width} height={height} viewBox="0 0 64 64">
      <Path
        d="M31.9639 57C45.7995 57 57.0154 45.8069 57.0154 32C57.0154 18.1929 45.7995 7 31.9639 7C18.8377 7 8.06946 17.0748 7 29.8985H40.112V34.1013H7C8.06946 46.9252 18.8377 57 31.9639 57Z"
        fill={fill}
      />
    </Svg>
  );
}
