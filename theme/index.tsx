import { useColorScheme } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "light" | "dark";

interface ColorPalette {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  secondaryText: string;
  tertiaryText: string;
  border: string;
  error: string;
  success: string;
  card: string;
  inputBackground: string;
  disabledButton: string;
  icon: string;
  networkBadge: string;
  actionIcon: string;
}

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorPalette;
}

const lightColors: ColorPalette = {
  background: "#F6F6F6",
  surface: "#F9F9FB",
  primary: "#5D5FEF",
  primaryLight: "#F0F0FF",
  text: "#333333",
  secondaryText: "#666666",
  tertiaryText: "#999999",
  border: "#F2F2F2",
  error: "#FF3B30",
  success: "#4CAF50",
  card: "#FFFFFF",
  inputBackground: "#F9F9F9",
  disabledButton: "#CCCCCC",
  icon: "#5D5FEF",
  networkBadge: "#F0F0FF",
  actionIcon: "#5D5FEF",
};

const darkColors: ColorPalette = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#6D6FFF",
  primaryLight: "#2D2D3F",
  text: "#FFFFFF",
  secondaryText: "#AAAAAA",
  tertiaryText: "#777777",
  border: "#2C2C2C",
  error: "#FF6B6B",
  success: "#4CD964",
  card: "#242424",
  inputBackground: "#2A2A2A",
  disabledButton: "#444444",
  icon: "#6D6FFF",
  networkBadge: "#2D2D3F",
  actionIcon: "#6D6FFF",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(
    colorScheme === "dark" ? "dark" : "light",
  );
  const [colors, setColors] = useState<ColorPalette>(
    theme === "dark" ? darkColors : lightColors,
  );

  useEffect(() => {
    const newTheme = colorScheme === "dark" ? "dark" : "light";
    setTheme(newTheme);
    setColors(newTheme === "dark" ? darkColors : lightColors);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={{ theme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
