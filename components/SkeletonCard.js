import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { colors, radius } from "../lib/theme";

function Shimmer({ style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[style, { opacity, backgroundColor: colors.borderSubtle }]}
    />
  );
}

export function TourCardSkeleton() {
  return (
    <View style={s.card}>
      <Shimmer style={s.img} />
      <View style={s.info}>
        <Shimmer style={s.line1} />
        <Shimmer style={s.line2} />
        <View style={s.footer}>
          <Shimmer style={s.price} />
          <Shimmer style={s.btn} />
        </View>
      </View>
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View style={s.bookCard}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Shimmer style={s.bookIcon} />
        <View style={{ flex: 1, gap: 8 }}>
          <Shimmer style={s.line1} />
          <Shimmer style={s.line3} />
        </View>
        <Shimmer style={s.badge} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Shimmer style={s.miniBtn} />
        <Shimmer style={s.miniBtn} />
      </View>
    </View>
  );
}

export function StatSkeleton({ count = 3 }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} style={s.statPill} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  img: { height: 190, width: "100%", borderRadius: 0 },
  info: { padding: 14, gap: 8 },
  line1: { height: 16, borderRadius: radius.sm, width: "70%" },
  line2: { height: 12, borderRadius: radius.sm, width: "45%" },
  line3: { height: 12, borderRadius: radius.sm, width: "55%" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: { height: 22, width: 80, borderRadius: radius.sm },
  btn: { height: 36, width: 100, borderRadius: radius.pill },
  bookCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bookIcon: { width: 48, height: 48, borderRadius: radius.lg },
  badge: { width: 70, height: 26, borderRadius: radius.pill },
  miniBtn: { flex: 1, height: 38, borderRadius: radius.lg },
  statPill: { flex: 1, height: 60, borderRadius: radius.xl },
});
