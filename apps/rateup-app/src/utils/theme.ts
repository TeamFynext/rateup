import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/utils/logger";

const THEME_KEY = "rateup_theme_preference";

export type ThemePreference = "light" | "dark" | "system";

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value as ThemePreference;
    }
  } catch (error) {
    logger.error("Error reading theme preference:", error);
  }
  return "system";
}

export async function setThemePreference(theme: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    logger.error("Error saving theme preference:", error);
  }
}
