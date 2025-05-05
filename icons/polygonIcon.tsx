import React from "react";
import { useTheme } from "@/theme";
import Svg, { Path } from "react-native-svg";

interface PolygonIconProps {
  width?: number;
  height?: number;
}

export default function PolygonIcon({
  width = 196,
  height = 196,
}: PolygonIconProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const fill = !isDarkMode ? "#000000" : "#FFFFFF";

  return (
    <Svg width={width} height={height} viewBox="0 0 64 64">
      <Path
        d="M42.837 10L28.8085 18.0568V43.2023L21.0684 47.6892L13.2809 43.1987V34.2213L21.0684 29.7744L26.0757 32.6782V25.4148L21.0247 22.5473L7 30.695V46.8122L21.072 54.9162L35.0968 46.8122V21.6703L42.8841 17.1797L50.6681 21.6703V30.6078L42.8841 35.1383L37.8333 32.2088V39.4359L42.837 42.3217L57 34.2649V18.0568L42.837 10Z"
        fill={fill}
      />
    </Svg>
  );
}
