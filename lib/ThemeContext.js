import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Color palettes ──────────────────────────────────────────────────────────

const LIGHT_BASE = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  elevated: "#FFF4EC",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textDisabled: "#9CA3AF",
  borderSubtle: "#E8E4DF",
  borderStrong: "#D4C4B7",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  overlay: "rgba(0,0,0,0.5)",
};

const DARK_BASE = {
  bg: "#130808ff",
  surface: "#1C1410",
  elevated: "#261D17",
  textPrimary: "#F5F0EB",
  textSecondary: "#9B8F85",
  textDisabled: "#6B6260",
  borderSubtle: "#2A201C",
  borderStrong: "#3D2E28",
  success: "#22C55E",
  warning: "#FBBF24",
  error: "#F87171",
  overlay: "rgba(0,0,0,0.75)",
};

// ─── Accent themes ────────────────────────────────────────────────────────────

export const ACCENT_THEMES = [
  {
    id: "saffron",
    name: "Saffron",
    emoji: "🔶",
    primary: "#D95D39",
    primaryHover: "#B94929",
    primaryLight: "#FDECE7",
    secondary: "#5C1615",
    secondaryLight: "#8A2A28",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    emoji: "🌊",
    primary: "#0284C7",
    primaryHover: "#0369A1",
    primaryLight: "#DBEAFE",
    secondary: "#0C4A6E",
    secondaryLight: "#075985",
  },
  {
    id: "forest",
    name: "Forest Green",
    emoji: "🌿",
    primary: "#16A34A",
    primaryHover: "#15803D",
    primaryLight: "#DCFCE7",
    secondary: "#14532D",
    secondaryLight: "#166534",
  },
  {
    id: "royal",
    name: "Royal Purple",
    emoji: "👑",
    primary: "#7C3AED",
    primaryHover: "#6D28D9",
    primaryLight: "#EDE9FE",
    secondary: "#3B0764",
    secondaryLight: "#4C1D95",
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    primary: "#EA580C",
    primaryHover: "#C2410C",
    primaryLight: "#FFF7ED",
    secondary: "#7C2D12",
    secondaryLight: "#9A3412",
  },
];

// ─── Build full theme object ──────────────────────────────────────────────────

const buildTheme = (mode, accentId) => {
  const base = mode === "dark" ? DARK_BASE : LIGHT_BASE;
  const accent =
    ACCENT_THEMES.find((t) => t.id === accentId) || ACCENT_THEMES[0];
  return { ...base, ...accent, mode };
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

const PREF_KEY = "theme_mode"; // 'light' | 'dark' | 'system'
const ACCENT_KEY = "theme_accent"; // accent theme id

export const ThemeProvider = ({ children }) => {
  const [modePreference, setModePreference] = useState("system"); // user choice
  const [accentId, setAccentId] = useState("saffron");
  const [systemMode, setSystemMode] = useState(
    Appearance.getColorScheme() || "light",
  );

  // Load saved preferences
  useEffect(() => {
    (async () => {
      const [savedMode, savedAccent] = await Promise.all([
        AsyncStorage.getItem(PREF_KEY),
        AsyncStorage.getItem(ACCENT_KEY),
      ]);
      if (savedMode) setModePreference(savedMode);
      if (savedAccent) setAccentId(savedAccent);
    })();
  }, []);

  // Listen to system color scheme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme || "light");
    });
    return () => sub.remove();
  }, []);

  const resolvedMode =
    modePreference === "system" ? systemMode : modePreference;
  const theme = buildTheme(resolvedMode, accentId);

  const setMode = useCallback(async (mode) => {
    setModePreference(mode);
    await AsyncStorage.setItem(PREF_KEY, mode);
  }, []);

  const setAccent = useCallback(async (id) => {
    setAccentId(id);
    await AsyncStorage.setItem(ACCENT_KEY, id);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        modePreference,
        accentId,
        setMode,
        setAccent,
        isDark: resolvedMode === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

// Drop-in replacement for the static `colors` import — returns theme-aware colors
export const useColors = () => {
  const { theme } = useTheme();
  return theme;
};
