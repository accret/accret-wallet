import React from "react";
import { useTheme } from "@/theme";
import Svg, { Path } from "react-native-svg";

interface EthereumIconProps {
  width?: number;
  height?: number;
}

export default function EthereumIcon({
  width = 196,
  height = 196,
}: EthereumIconProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const fill = !isDarkMode ? "#000000" : "#FFFFFF";

  return (
    <Svg width={width} height={height} viewBox="0 0 64 64">
      <Path
        d="M32.3465 7L32.0113 8.13934V41.2005L32.3465 41.5351L47.6931 32.4637L32.3465 7Z"
        fill={fill}
      />
      <Path d="M32.3465 7L17 32.4637L32.3466 41.5352L32.3465 7Z" fill={fill} />
      <Path
        d="M32.3465 44.4408L32.1576 44.6711V56.4482L32.3465 57L47.7022 35.3741L32.3465 44.4408Z"
        fill={fill}
      />
      <Path
        d="M32.3466 56.9998V44.4407L17 35.3739L32.3466 56.9998Z"
        fill={fill}
      />
      <Path
        d="M32.3465 41.5351L47.6929 32.4638L32.3465 25.4884V41.5351Z"
        fill={fill}
      />
      <Path
        d="M17.0001 32.4638L32.3465 41.5351V25.4884L17.0001 32.4638Z"
        fill={fill}
      />
    </Svg>
  );
}
