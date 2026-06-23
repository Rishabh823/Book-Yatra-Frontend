// Design tokens from /app/design_guidelines.json
export const colors = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  elevated: "#FFF4EC",
  primary: "#D95D39",
  primaryHover: "#B94929",
  primaryLight: "#FDECE7",
  secondary: "#5C1615",
  secondaryLight: "#8A2A28",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textDisabled: "#9CA3AF",
  borderSubtle: "#E5E7EB",
  borderStrong: "#D4C4B7",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  overlay: "rgba(0,0,0,0.5)",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const fonts = {
  heading: "Manrope_700",
  headingRegular: "Manrope_600SemiBold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemiBold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
  accent: "Manrope_700Bold",
};
export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
};
