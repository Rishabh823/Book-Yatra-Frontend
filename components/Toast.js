import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius } from "../lib/theme";

const CONFIGS = {
  success: {
    bg: "#FFF8F0",
    border: "#C8601A",
    accent: "#E8701A",
    iconBg: "#E8701A",
    icon: "checkmark-circle",
    title: "Success",
  },
  error: {
    bg: "#FFF0F0",
    border: "#C0392B",
    accent: "#C0392B",
    iconBg: "#C0392B",
    icon: "alert-circle",
    title: "Error",
  },
  info: {
    bg: "#F0F5FF",
    border: "#2563EB",
    accent: "#2563EB",
    iconBg: "#2563EB",
    icon: "information-circle",
    title: "Info",
  },
  warning: {
    bg: "#FFFBEB",
    border: "#D97706",
    accent: "#D97706",
    iconBg: "#D97706",
    icon: "warning",
    title: "Warning",
  },
};

export default function Toast({
  message,
  type = "error",
  visible,
  onHide,
  duration = 3500,
}) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && message) {
      // progress.setValue(1);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // const progressAnim = Animated.timing(progress, {
      //   toValue: 0,
      //   duration: duration - 400,
      //   delay: 200,
      //   useNativeDriver: false,
      // });
      // progressAnim.start();

      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => {
        clearTimeout(t);
        // progressAnim.stop();
      };
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }
  }, [visible, message]);

  if (!message) return null;

  const cfg = CONFIGS[type] || CONFIGS.error;

  return (
    <Animated.View
      style={[s.wrap, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View
        style={[s.toast, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
      >
        {/* Left accent bar */}
        <View style={[s.accentBar, { backgroundColor: cfg.accent }]} />

        {/* Icon */}
        <View style={[s.iconWrap, { backgroundColor: cfg.iconBg + "18" }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.iconBg} />
        </View>

        {/* Text */}
        <View style={s.textWrap}>
          <Text style={[s.title, { color: cfg.accent }]}>{cfg.title}</Text>
          <Text style={s.msg} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      {/* <View style={[s.progressBg, { borderColor: cfg.border }]}>
        <Animated.View
          style={[
            s.progressFill,
            { backgroundColor: cfg.accent },
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View> */}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
    gap: 12,
    paddingRight: 16,
    paddingVertical: 14,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
    marginLeft: -1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  msg: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#4B4B4B",
    lineHeight: 18,
  },
  progressBg: {
    height: 3,
    backgroundColor: "transparent",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: "hidden",
    marginTop: -1,
    borderWidth: 0,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
