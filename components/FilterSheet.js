import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "../lib/theme";
import { DateInput } from "./DateInput";

const TOUR_TYPES = [
  { k: "temple", label: "Temple" },
  { k: "pilgrimage", label: "Pilgrimage" },
  { k: "mountain", label: "Mountain" },
  { k: "leisure", label: "Leisure" },
  { k: "heritage", label: "Heritage" },
  { k: "beach", label: "Beach" },
  { k: "other", label: "Other" },
];

const DURATIONS = [
  { k: "1", label: "1 Day" },
  { k: "2", label: "2 Days" },
  { k: "3", label: "3-4 Days" },
  { k: "5", label: "5-7 Days" },
  { k: "8", label: "8+ Days" },
];

const SORT_OPTIONS = [
  { k: "date_asc", label: "Earliest First", icon: "calendar" },
  { k: "date_desc", label: "Latest First", icon: "calendar-outline" },
  { k: "price_asc", label: "Price: Low to High", icon: "arrow-up" },
  { k: "price_desc", label: "Price: High to Low", icon: "arrow-down" },
  { k: "popular", label: "Most Popular", icon: "flame" },
];

const PRICE_RANGES = [
  { k: "0-2000", label: "Under ₹2,000" },
  { k: "2000-5000", label: "₹2,000 – ₹5,000" },
  { k: "5000-10000", label: "₹5,000 – ₹10,000" },
  { k: "10000+", label: "Above ₹10,000" },
];

export const DEFAULT_FILTERS = {
  types: [],
  durations: [],
  priceRanges: [],
  sortBy: "date_asc",
  dateFrom: "",
  dateTo: "",
};

export default function FilterSheet({
  visible,
  filters = DEFAULT_FILTERS,
  onApply,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(height)).current;

  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : height,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  const toggleItem = useCallback((key, value) => {
    setLocal((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }, []);

  const activeCount =
    local.types.length +
    local.durations.length +
    local.priceRanges.length +
    (local.sortBy !== "date_asc" ? 1 : 0) +
    (local.dateFrom ? 1 : 0) +
    (local.dateTo ? 1 : 0);

  const handleReset = useCallback(() => setLocal(DEFAULT_FILTERS), []);
  const handleApply = useCallback(() => {
    onApply?.(local);
    onClose?.();
  }, [local, onApply, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters & Sort</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {activeCount > 0 && (
              <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                <Text style={styles.resetText}>Reset ({activeCount})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flexGrow: 1 }}
        >
          {/* Date Range */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Travel Date Range</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <DateInput
                  label="From"
                  value={local.dateFrom}
                  onChange={(v) => setLocal((prev) => ({ ...prev, dateFrom: v, dateTo: prev.dateTo && v && prev.dateTo < v ? "" : prev.dateTo }))}
                />
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.textDisabled} style={{ marginBottom: 8 }} />
              <View style={{ flex: 1 }}>
                <DateInput
                  label="To"
                  value={local.dateTo}
                  onChange={(v) => setLocal((prev) => ({ ...prev, dateTo: v }))}
                  minDate={local.dateFrom ? new Date(local.dateFrom + "T12:00:00") : undefined}
                />
              </View>
              {(local.dateFrom || local.dateTo) && (
                <TouchableOpacity
                  onPress={() => setLocal((prev) => ({ ...prev, dateFrom: "", dateTo: "" }))}
                  style={{ padding: 4, marginBottom: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sort */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Sort By</Text>
            <View style={styles.chipWrap}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.k}
                  style={[
                    styles.chip,
                    local.sortBy === opt.k && styles.chipActive,
                  ]}
                  onPress={() =>
                    setLocal((prev) => ({ ...prev, sortBy: opt.k }))
                  }
                >
                  <Ionicons
                    name={opt.icon}
                    size={12}
                    color={
                      local.sortBy === opt.k ? "white" : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.chipText,
                      local.sortBy === opt.k && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Price Range</Text>
            <View style={styles.chipWrap}>
              {PRICE_RANGES.map((p) => {
                const active = local.priceRanges.includes(p.k);
                return (
                  <TouchableOpacity
                    key={p.k}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleItem("priceRanges", p.k)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tour Type */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Tour Type</Text>
            <View style={styles.chipWrap}>
              {TOUR_TYPES.map((t) => {
                const active = local.types.includes(t.k);
                return (
                  <TouchableOpacity
                    key={t.k}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleItem("types", t.k)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Duration</Text>
            <View style={styles.chipWrap}>
              {DURATIONS.map((d) => {
                const active = local.durations.includes(d.k);
                return (
                  <TouchableOpacity
                    key={d.k}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleItem("durations", d.k)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Apply */}
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={handleApply}
          activeOpacity={0.85}
        >
          <Text style={styles.applyText}>
            Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Text>
          <Ionicons name="checkmark" size={18} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    ...shadow.card,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  resetBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.error,
  },

  group: { paddingHorizontal: 20, paddingTop: 20 },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  groupLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: { color: "white" },

  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  applyText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },
});
