import React from "react";
import { View, Text, StyleSheet } from "react-native";

const TIER_STYLES = {
  bronze: { bg: "#FEF3C7", color: "#92400E", icon: "🥉" },
  silver: { bg: "#F3F4F6", color: "#6B7280", icon: "🥈" },
  gold: { bg: "#FFFBEB", color: "#D97706", icon: "🥇" },
  platinum: { bg: "#EEF2FF", color: "#4338CA", icon: "💎" },
};

export default function LevelBadge({
  tier = "bronze",
  points,
  showPoints = false,
}) {
  const s = TIER_STYLES[tier] || TIER_STYLES.bronze;
  return (
    <View style={[styles.container, { backgroundColor: s.bg }]}>
      <Text style={styles.icon}>{s.icon}</Text>
      <Text style={[styles.tier, { color: s.color }]}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Text>
      {showPoints && points !== undefined && (
        <Text style={[styles.points, { color: s.color }]}>
          {points.toLocaleString()} pts
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  icon: { fontSize: 14 },
  tier: { fontFamily: "Manrope_700Bold", fontSize: 13 },
  points: { fontFamily: "Manrope_400Regular", fontSize: 11 },
});
