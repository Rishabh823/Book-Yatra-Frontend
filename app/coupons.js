import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import Toast from "../components/Toast";
import { useToast } from "../lib/hooks/useToast";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../lib/api";
import { colors, fonts, radius, shadow } from "../lib/theme";

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [coupons, setCoupons] = useState([]);

  useFocusEffect(
    useCallback(() => {
      api
        .get("/coupons/active")
        .then((res) => setCoupons(res.data || []))
        .catch(() => {});
    }, []),
  );

  const validate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    try {
      const res = await api.post("/coupons/validate", {
        code: code.trim().toUpperCase(),
        amount: 0,
      });
      setResult({ success: true, ...res.data });
    } catch (err) {
      setResult({ success: false, message: err.message || "Invalid coupon" });
    }
    setValidating(false);
  };

  const copyCode = (c) => {
    Clipboard.setString(c);
    showToast("Coupon code copied to clipboard!", "success");
  };

  const fmtExpiry = (d) => {
    if (!d) return "";
    const days = Math.ceil((new Date(d) - Date.now()) / 86400000);
    if (days <= 0) return "Expired";
    if (days === 1) return "1 day left";
    if (days <= 7) return days + " days left";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Offers & Coupons</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Coupon checker */}
        <View style={[styles.checkerCard, shadow.card]}>
          <Text style={styles.sectionTitle}>Check Coupon</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.applyBtn, !code.trim() && styles.applyBtnDisabled]}
              onPress={validate}
              disabled={!code.trim() || validating}
            >
              {validating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.applyText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
          {result && (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: result.success ? "#DCFCE7" : "#FEE2E2" },
              ]}
            >
              <Ionicons
                name={result.success ? "checkmark-circle" : "close-circle"}
                size={18}
                color={result.success ? "#16A34A" : "#DC2626"}
              />
              {result.success ? (
                <Text style={[styles.resultText, { color: "#16A34A" }]}>
                  Valid!{" "}
                  {result.type === "percentage"
                    ? result.value + "% off"
                    : "₹" + result.value + " off"}
                </Text>
              ) : (
                <Text style={[styles.resultText, { color: "#DC2626" }]}>
                  {result.message}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Available coupons */}
        {coupons.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Available Coupons</Text>
            {coupons.map((c) => {
              const expiry = fmtExpiry(c.validTill);
              const isExpiring = expiry.includes("day");
              return (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.couponCard, shadow.soft]}
                  onPress={() => copyCode(c.code)}
                >
                  <LinearGradient
                    colors={["#D95D39", "#5C1615"]}
                    style={styles.couponLeft}
                  >
                    <Text style={styles.couponCode}>{c.code}</Text>
                    <Text style={styles.couponTap}>Tap to copy</Text>
                  </LinearGradient>
                  <View style={styles.couponRight}>
                    <Text style={styles.couponValue}>
                      {c.type === "percentage"
                        ? c.value + "% OFF"
                        : "₹" + c.value + " OFF"}
                    </Text>
                    <Text style={styles.couponMin}>
                      Min ₹{c.minBookingAmount || 0}
                    </Text>
                    <Text
                      style={[
                        styles.couponExpiry,
                        isExpiring && { color: "#DC2626" },
                      ]}
                    >
                      {expiry}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Earn more */}
        <TouchableOpacity
          style={[styles.earnCard, shadow.soft]}
          onPress={() => router.push("/rewards")}
        >
          <View style={styles.earnIcon}>
            <Ionicons name="star-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnTitle}>Earn Reward Points</Text>
            <Text style={styles.earnSub}>
              Get exclusive discounts by redeeming points
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 22,
    color: "white",
  },
  checkerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  codeInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnDisabled: { backgroundColor: "#E5E7EB" },
  applyText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    padding: 12,
  },
  resultText: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  couponCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    marginBottom: 10,
  },
  couponLeft: {
    width: 110,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  couponCode: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "white",
    letterSpacing: 1,
  },
  couponTap: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  couponRight: { flex: 1, padding: 14, justifyContent: "center", gap: 4 },
  couponValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.primary,
  },
  couponMin: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  couponExpiry: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  earnCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  earnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  earnTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  earnSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
