import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius } from "../lib/theme";

const CONFIGS = {
  error: {
    bg: "#2D0A0A",
    border: "#C0392B",
    icon: "alert-circle",
    color: "#FF6B6B",
  },
  success: {
    bg: "#0A2D15",
    border: "#27AE60",
    icon: "checkmark-circle",
    color: "#6BFF9E",
  },
  info: {
    bg: "#0A1A2D",
    border: "#2980B9",
    icon: "information-circle",
    color: "#6BB8FF",
  },
};

export default function Toast({
  message,
  type = "error",
  visible,
  onHide,
  duration = 3500,
}) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(t);
    } else {
      translateY.setValue(100);
      opacity.setValue(0);
    }
  }, [visible, message]);

  if (!message) return null;

  const cfg = CONFIGS[type] || CONFIGS.error;

  return (
    <Animated.View style={[s.wrap, { opacity, transform: [{ translateY }] }]}>
      <View
        style={[s.toast, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
      >
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        <Text style={[s.text, { color: "#fff" }]} numberOfLines={3}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
