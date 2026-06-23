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
import { api } from "../lib/api";
import { fonts } from "../lib/theme";

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
      {/* Flat white header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Offers & Coupons</Text>
        <View style={styles.headerRight}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
        </View>
      </View>

      {/* Gray band */}
      <View style={styles.grayBand} />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Coupon checker */}
        <View style={styles.checkerCard}>
          <Text style={styles.checkerTitle}>Check Coupon</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="Enter coupon code"
              placeholderTextColor="#9CA3AF"
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
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>Available Coupons</Text>
            {coupons.map((c) => {
              const expiry = fmtExpiry(c.validTill);
              const isExpiring = expiry.includes("day");
              const barColor = c.color || "#D95D39";
              return (
                <TouchableOpacity
                  key={c._id}
                  style={styles.couponCard}
                  onPress={() => copyCode(c.code)}
                  activeOpacity={0.8}
                >
                  {/* Left colored bar */}
                  <View style={[styles.couponBar, { backgroundColor: barColor }]} />

                  {/* Card body */}
                  <View style={styles.couponBody}>
                    {/* Top row: code badge + copy button */}
                    <View style={styles.couponTopRow}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>{c.code}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => copyCode(c.code)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.copyText}>Copy</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Value */}
                    <Text style={styles.couponValue}>
                      {c.type === "percentage"
                        ? c.value + "% OFF"
                        : "₹" + c.value + " OFF"}
                    </Text>

                    {/* Bottom row: min amount + expiry */}
                    <View style={styles.couponBottomRow}>
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
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Earn more */}
        <TouchableOpacity
          style={styles.earnCard}
          onPress={() => router.push("/rewards")}
          activeOpacity={0.8}
        >
          <View style={styles.earnIcon}>
            <Ionicons name="star-outline" size={24} color="#D95D39" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnTitle}>Earn Reward Points</Text>
            <Text style={styles.earnSub}>
              Get exclusive discounts by redeeming points
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D95D39" />
        </TouchableOpacity>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 18,
    color: "#111827",
    marginLeft: 10,
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Gray band */
  grayBand: {
    height: 10,
    backgroundColor: "#F2F2F2",
  },

  /* Checker card */
  checkerCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  checkerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#111827",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#111827",
    letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: "#D95D39",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  applyText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "white",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  resultText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    flex: 1,
  },

  /* Section label */
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#111827",
  },

  /* Coupon cards */
  couponCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    overflow: "hidden",
  },
  couponBar: {
    width: 4,
    backgroundColor: "#D95D39",
    borderRadius: 2,
  },
  couponBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  couponTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeBadge: {
    backgroundColor: "#FEF3F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#D95D39",
    letterSpacing: 1,
  },
  copyBtn: {
    borderWidth: 1,
    borderColor: "#D95D39",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#D95D39",
  },
  couponValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: "#D95D39",
  },
  couponBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponMin: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#6B7280",
  },
  couponExpiry: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: "#6B7280",
  },

  /* Earn card */
  earnCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  earnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEF3F0",
    alignItems: "center",
    justifyContent: "center",
  },
  earnTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#111827",
  },
  earnSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});
