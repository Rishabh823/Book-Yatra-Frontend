import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import {
  tours as toursApi,
  bookings as bookingsApi,
  auth as authApi,
  coupons as couponsApi,
  walletApi,
} from "../../lib/api";
import RazorpayCheckout from "../../components/RazorpayCheckout";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

// ─── Seat map (modern redesign) ──────────────────────────────────────────────
const SEAT_W = 46;
const SEAT_H = 50;
const SEAT_GAP = 7;

function SeatMap({
  totalSeats,
  seatStructure,
  occupiedSeats,
  selectedSeats,
  onToggle,
  maxSelect,
}) {
  const layout = seatStructure === "2x3" ? [2, 3] : [2, 2];
  const seatsPerRow = layout[0] + layout[1];
  const rows = Math.ceil(totalSeats / seatsPerRow);
  const occupiedMap = {};
  (occupiedSeats || []).forEach((s) => {
    occupiedMap[s.seatNumber] = s.gender || "Other";
  });

  return (
    <View style={sm.container}>
      {/* Bus front */}
      <View style={sm.busFront}>
        <View style={sm.windshield} />
        <View style={sm.driverArea}>
          <View style={sm.steeringCircle}>
            <Ionicons name="radio-button-on" size={16} color="#fff" />
          </View>
          <Text style={sm.driverTxt}>DRIVER</Text>
        </View>
      </View>

      {/* Seat grid */}
      <View style={sm.busBody}>
        {Array.from({ length: rows }, (_, rowIdx) => {
          const rowStart = rowIdx * seatsPerRow + 1;
          const leftSeats = Array.from(
            { length: layout[0] },
            (_, i) => rowStart + i,
          );
          const rightSeats = Array.from(
            { length: layout[1] },
            (_, i) => rowStart + layout[0] + i,
          );
          return (
            <View key={rowIdx} style={sm.row}>
              <View style={sm.seatGroup}>
                {leftSeats.map((n) =>
                  n <= totalSeats ? (
                    <Seat
                      key={n}
                      number={n}
                      gender={occupiedMap[n]}
                      selected={selectedSeats.includes(n)}
                      onPress={() => {
                        if (!occupiedMap[n]) onToggle(n, maxSelect);
                      }}
                    />
                  ) : (
                    <View key={n} style={{ width: SEAT_W, height: SEAT_H }} />
                  ),
                )}
              </View>
              <View style={sm.aisleWrap}>
                <Text style={sm.aisleNum}>{rowIdx + 1}</Text>
              </View>
              <View style={sm.seatGroup}>
                {rightSeats.map((n) =>
                  n <= totalSeats ? (
                    <Seat
                      key={n}
                      number={n}
                      gender={occupiedMap[n]}
                      selected={selectedSeats.includes(n)}
                      onPress={() => {
                        if (!occupiedMap[n]) onToggle(n, maxSelect);
                      }}
                    />
                  ) : (
                    <View key={n} style={{ width: SEAT_W, height: SEAT_H }} />
                  ),
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={sm.legend}>
        <LegendItem color="#F0FFF4" border="#22C55E" label="Available" />
        <LegendItem color="#FCE7F3" border="#EC4899" label="Female" />
        <LegendItem color="#E5E7EB" border="#9CA3AF" label="Occupied" />
        <LegendItem
          color={colors.primary}
          border={colors.primary}
          label="Selected"
          textColor="#fff"
        />
      </View>
    </View>
  );
}

function Seat({ number, gender, selected, onPress }) {
  let seatBg = "#F0FFF4",
    seatBorder = "#22C55E",
    topBg = "#22C55E22";
  let iconColor = "#22C55E",
    numColor = "#16A34A";

  if (gender === "Female") {
    seatBg = "#FCE7F3";
    seatBorder = "#EC4899";
    topBg = "#EC489922";
    iconColor = "#EC4899";
    numColor = "#9D174D";
  } else if (gender === "Male" || gender === "Other") {
    seatBg = "#E5E7EB";
    seatBorder = "#9CA3AF";
    topBg = "#9CA3AF44";
    iconColor = "#6B7280";
    numColor = "#374151";
  }
  if (selected) {
    seatBg = colors.primary;
    seatBorder = colors.primary;
    topBg = colors.primary;
    iconColor = "#fff";
    numColor = "#fff";
  }

  const taken = !!gender;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={taken}
      activeOpacity={taken ? 1 : 0.72}
      style={[sm.seat, { backgroundColor: seatBg, borderColor: seatBorder }]}
    >
      {/* Seat back / headrest */}
      <View
        style={[
          sm.seatBack,
          { backgroundColor: topBg, borderBottomColor: seatBorder },
        ]}
      >
        <Ionicons
          name="person"
          size={12}
          color={selected ? "#fff" : iconColor}
        />
      </View>
      {/* Seat cushion */}
      <View style={sm.seatCushion}>
        <Text style={[sm.seatNum, { color: numColor }]}>{number}</Text>
      </View>
    </TouchableOpacity>
  );
}

function LegendItem({ color, border, label, textColor }) {
  return (
    <View style={sm.legendItem}>
      <View
        style={[sm.legendSeat, { backgroundColor: color, borderColor: border }]}
      >
        <Ionicons name="person" size={9} color={textColor || border} />
      </View>
      <Text style={sm.legendLabel}>{label}</Text>
    </View>
  );
}

const sm = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 4 },
  busFront: {
    width: 220,
    height: 52,
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
    overflow: "hidden",
  },
  windshield: {
    position: "absolute",
    top: 8,
    left: 20,
    right: 20,
    height: 22,
    backgroundColor: "#A8D8EA",
    borderRadius: 10,
    opacity: 0.6,
  },
  driverArea: {
    position: "absolute",
    right: 24,
    top: 8,
    alignItems: "center",
    gap: 1,
  },
  steeringCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverTxt: {
    fontFamily: fonts.accent,
    fontSize: 6,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
  },
  busBody: {
    backgroundColor: "#FAFAFA",
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.secondary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 12,
    paddingTop: 10,
    gap: SEAT_GAP,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 0 },
  seatGroup: { flexDirection: "row", gap: SEAT_GAP },
  aisleWrap: { width: 32, alignItems: "center", justifyContent: "center" },
  aisleNum: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textDisabled,
    letterSpacing: 0.5,
  },
  seat: {
    width: SEAT_W,
    height: SEAT_H,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  seatBack: {
    height: 26,
    borderBottomWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  seatCushion: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  seatNum: { fontFamily: fonts.bodyBold, fontSize: 10 },
  legend: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSeat: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  legendLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
const STEP_LABELS = ["Personal", "Select Seats", "Review"];

export default function Booking() {
  const insets = useSafeAreaInsets();
  const { tourId } = useLocalSearchParams();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seatMapData, setSeatMapData] = useState(null);
  const [seatMapLoading, setSeatMapLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [checkout, setCheckout] = useState(null);
  const [pendingBookingId, setPendingBookingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
  });
  const [numberOfSeats, setNumberOfSeats] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [extraPassengers, setExtraPassengers] = useState([]);

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null); // { code, discountAmount, type, value }
  const [couponChecking, setCouponChecking] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        if (tourId) {
          const t = await toursApi.byId(tourId).catch(() => null);
          if (t) setTour(t?.data || t);
        }
        const u = await authApi.getUser();
        if (u)
          setForm((f) => ({
            ...f,
            name:
              u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "",
            email: u.email || "",
            phone: u.phone || u.mobile || "",
          }));
        walletApi.balance().then((r) => setWalletBalance(r?.data?.balance || r?.balance || 0)).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, [tourId]);

  const loadSeatMap = useCallback(async () => {
    if (!tourId || seatMapData) return;
    setSeatMapLoading(true);
    try {
      const data = await bookingsApi.seatMap(tourId);
      setSeatMapData(data);
    } catch {
      setSeatMapData({
        totalSeats: tour?.totalSeats || 40,
        seatStructure: "2x2",
        occupiedSeats: [],
      });
    } finally {
      setSeatMapLoading(false);
    }
  }, [tourId, seatMapData, tour]);

  useEffect(() => {
    if (step === 2) loadSeatMap();
  }, [step]);

  const toggleSeat = (seatNum, max) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNum)) return prev.filter((s) => s !== seatNum);
      if (prev.length >= max) {
        showToast(`Max ${max} seat(s) allowed`);
        return prev;
      }
      return [...prev, seatNum];
    });
  };

  const adjustSeats = (delta) => {
    const next = Math.max(1, Math.min(10, numberOfSeats + delta));
    setNumberOfSeats(next);
    setSelectedSeats((prev) => prev.slice(0, next));
    setExtraPassengers((prev) => {
      const needed = next - 1;
      if (needed <= 0) return [];
      if (needed > prev.length)
        return [
          ...prev,
          ...Array(needed - prev.length)
            .fill(null)
            .map(() => ({ name: "", phone: "", email: "", gender: "" })),
        ];
      return prev.slice(0, needed);
    });
  };

  const setPassenger = (idx, key, val) =>
    setExtraPassengers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [key]: val } : p)),
    );

  const priceNum =
    parseInt(String(tour?.price || "0").replace(/[^0-9]/g, ""), 10) || 0;
  const subtotal = priceNum * numberOfSeats;
  const discount = couponApplied?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    try {
      const res = await couponsApi.validate({
        code: couponCode.trim(),
        amount: subtotal,
      });
      const d = res?.data || res;
      if (d?.valid) {
        setCouponApplied({
          code: couponCode.trim().toUpperCase(),
          discountAmount: d.discountAmount,
          type: d.type,
          value: d.value,
        });
        showToast(`Coupon applied! You save ₹${d.discountAmount}`, "success");
      } else {
        showToast(res?.message || "Invalid coupon", "error");
      }
    } catch (e) {
      showToast(e.message || "Invalid coupon code", "error");
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim()) {
        showToast("Full name is required.");
        return false;
      }
      if (!form.phone.trim()) {
        showToast("Mobile number is required.");
        return false;
      }
      if (!form.gender) {
        showToast("Please select your gender.");
        return false;
      }
      for (let i = 0; i < extraPassengers.length; i++) {
        const p = extraPassengers[i];
        if (!p.name.trim()) {
          showToast(`Passenger ${i + 2}: name required.`);
          return false;
        }
        if (!p.phone.trim()) {
          showToast(`Passenger ${i + 2}: mobile required.`);
          return false;
        }
        if (!p.gender) {
          showToast(`Passenger ${i + 2}: gender required.`);
          return false;
        }
      }
    }
    if (step === 2 && selectedSeats.length < numberOfSeats) {
      showToast(`Please select ${numberOfSeats} seat(s).`);
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    tourId: tour?._id || tourId,
    tourTitle: tour?.title || "",
    tripDate: tour?.startDate
      ? new Date(tour.startDate).toISOString()
      : new Date().toISOString(),
    name: form.name,
    phone: form.phone,
    email: form.email || undefined,
    gender: form.gender || undefined,
    numberOfSeats,
    seats: selectedSeats,
    totalAmount: subtotal,
    couponCode: couponApplied?.code || undefined,
    additionalPassengers:
      extraPassengers.length > 0
        ? extraPassengers.map((p) => ({
            name: p.name,
            phone: p.phone,
            email: p.email || undefined,
            gender: p.gender || undefined,
          }))
        : undefined,
  });

  // ── BOOKING-FIRST FLOW ───────────────────────────────────────────────────
  // 1. Create booking (pending) → get bookingId
  // 2. Create Razorpay order with bookingId
  // 3. User pays via Razorpay
  // 4. Verify payment → booking confirmed
  // 5. If no payment gateway → booking stays pending (cash mode)
  const onConfirm = async () => {
    const authed = await authApi.isAuthenticated();
    if (!authed) {
      showToast("Please login to confirm your booking.", "error");
      return;
    }
    setSubmitting(true);
    try {
      // Step 1: Create booking first
      const bookingRes = await bookingsApi.create(buildPayload());
      const bookingId = bookingRes?._id || bookingRes?.data?._id;
      if (!bookingId)
        throw new Error("Failed to create booking. Please try again.");
      setPendingBookingId(bookingId);

      // Step 2: Try to create a Razorpay order (with optional wallet)
      const orderRes = await bookingsApi
        .createOrder({
          bookingId,
          useWallet,
          couponCode: couponApplied?.code || undefined,
        })
        .catch(() => null);
      const order = orderRes?.data || orderRes;

      if (order?.fullyPaidByWallet) {
        // Wallet covered the full amount — no Razorpay needed
        showToast("Payment successful! Paid from wallet.", "success");
        setTimeout(() => router.replace("/(tabs)/bookings"), 1800);
      } else if (order?.orderId && order?.key) {
        // Payment gateway configured — open Razorpay (possibly partial after wallet deduction)
        setCheckout({
          key: order.key,
          orderId: order.orderId,
          amount: order.amount ?? total * 100,
          currency: order.currency || "INR",
          name: "Book Yatra",
          description: `${tour?.title || "Yatra"} · ${numberOfSeats} seat(s)`,
          prefill: { name: form.name, email: form.email, contact: form.phone },
        });
      } else {
        // No payment gateway (cash / test mode) — booking already created
        showToast("Booking placed successfully!", "success");
        setTimeout(() => router.replace("/(tabs)/bookings"), 1600);
      }
    } catch (e) {
      showToast(e.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Called by RazorpayCheckout after successful payment
  const onPaid = async ({ paymentId, orderId, signature }) => {
    setCheckout(null);
    setSubmitting(true);
    try {
      // Verify payment — booking already exists, just confirm it
      await bookingsApi.verifyPayment({
        bookingId: pendingBookingId,
        paymentId,
        orderId,
        signature,
      });
      showToast("Payment successful! Your seat is confirmed.", "success");
      setTimeout(() => router.replace("/(tabs)/bookings"), 1800);
    } catch (e) {
      showToast(
        e.message ||
          "Payment received but booking failed. Share your payment ID with support.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={s.head}>
          <TouchableOpacity
            onPress={() =>
              step > 1
                ? setStep(step - 1)
                : router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)")
            }
            style={s.iconBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Book Yatra</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stepper */}
        <View style={s.stepper}>
          {STEP_LABELS.map((lbl, idx) => {
            const n = idx + 1;
            return (
              <View
                key={n}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <View style={{ alignItems: "center", gap: 4 }}>
                  <View
                    style={[
                      s.stepDot,
                      step >= n && s.stepDotActive,
                      step > n && s.stepDotDone,
                    ]}
                  >
                    {step > n ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={[s.stepNum, step >= n && { color: "#fff" }]}>
                        {n}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.stepLabel, step >= n && s.stepLabelActive]}>
                    {lbl}
                  </Text>
                </View>
                {idx < 2 && (
                  <View
                    style={[
                      s.stepLine,
                      step > n && { backgroundColor: colors.success },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tour summary */}
          {tour && (
            <View style={s.summary}>
              <LinearGradient
                colors={[colors.secondary, "#1E0504"]}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Decorative circles */}
              <View style={s.decCircle1} />
              <View style={s.decCircle2} />
              <Text style={s.summaryTitle} numberOfLines={1}>
                {tour.title}
              </Text>
              <View style={s.summaryRow}>
                <Ionicons name="location" size={12} color="#FFE9C0" />
                <Text style={s.summaryMeta}>
                  {tour.source} → {tour.destination}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Ionicons name="calendar" size={12} color="#FFE9C0" />
                <Text style={s.summaryMeta}>
                  {new Date(tour.startDate).toLocaleDateString("en-IN")} –{" "}
                  {new Date(tour.endDate).toLocaleDateString("en-IN")}
                </Text>
              </View>
              <View style={s.summaryFooter}>
                <View style={s.priceBadge}>
                  <Text style={s.priceBadgeTxt}>
                    ₹{priceNum > 0 ? priceNum : tour.price || "—"} / seat
                  </Text>
                </View>
                {numberOfSeats > 0 && priceNum > 0 && (
                  <Text style={s.totalBadge}>Total: ₹{total}</Text>
                )}
              </View>
            </View>
          )}

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <>
              <Text style={s.sectionLabel}>· Traveller Details ·</Text>

              {[
                {
                  k: "name",
                  label: "Full Name *",
                  icon: "person-outline",
                  kb: "default",
                },
                {
                  k: "phone",
                  label: "Mobile Number *",
                  icon: "call-outline",
                  kb: "phone-pad",
                },
                {
                  k: "email",
                  label: "Email (optional)",
                  icon: "mail-outline",
                  kb: "email-address",
                },
              ].map((f) => (
                <View key={f.k} style={s.field}>
                  <Text style={s.label}>{f.label}</Text>
                  <View style={s.inputWrap}>
                    <Ionicons
                      name={f.icon}
                      size={18}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={s.input}
                      placeholder={
                        f.k === "name"
                          ? "Your full name"
                          : f.k === "phone"
                            ? "+91 98xxxxxxxx"
                            : "you@example.com"
                      }
                      placeholderTextColor={colors.textDisabled}
                      keyboardType={f.kb}
                      autoCapitalize={f.k === "email" ? "none" : "words"}
                      value={form[f.k]}
                      onChangeText={(v) => set(f.k, v)}
                    />
                  </View>
                </View>
              ))}

              <Text style={s.label}>Gender *</Text>
              <View style={s.genderRow}>
                {["Male", "Female", "Other"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      s.genderChip,
                      form.gender === g && s.genderChipActive,
                    ]}
                    onPress={() => set("gender", form.gender === g ? "" : g)}
                  >
                    <Ionicons
                      name={
                        g === "Male"
                          ? "male"
                          : g === "Female"
                            ? "female"
                            : "person"
                      }
                      size={14}
                      color={form.gender === g ? "#fff" : colors.textSecondary}
                    />
                    <Text
                      style={[
                        s.genderText,
                        form.gender === g && { color: "#fff" },
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Number of Seats</Text>
              <View style={s.seatCountRow}>
                <TouchableOpacity
                  style={s.seatBtn}
                  onPress={() => adjustSeats(-1)}
                >
                  <Ionicons name="remove" size={20} color={colors.secondary} />
                </TouchableOpacity>
                <View style={s.seatValueWrap}>
                  <Text style={s.seatValue}>{numberOfSeats}</Text>
                  <Text style={s.seatValueSub}>
                    seat{numberOfSeats > 1 ? "s" : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.seatBtn}
                  onPress={() => adjustSeats(1)}
                >
                  <Ionicons name="add" size={20} color={colors.secondary} />
                </TouchableOpacity>
                {priceNum > 0 && (
                  <View style={s.priceCalc}>
                    <Text style={s.priceCalcTxt}>
                      ₹{priceNum} × {numberOfSeats}
                    </Text>
                    <Text style={s.priceCalcTotal}>₹{total}</Text>
                  </View>
                )}
              </View>

              {extraPassengers.map((p, i) => (
                <View key={i} style={s.passengerCard}>
                  <View style={s.passengerHeader}>
                    <View style={s.passengerBadge}>
                      <Text style={s.passengerBadgeTxt}>{i + 2}</Text>
                    </View>
                    <Text style={s.passengerTitle}>Passenger {i + 2}</Text>
                  </View>
                  {[
                    {
                      k: "name",
                      label: "Full Name *",
                      icon: "person-outline",
                      kb: "default",
                    },
                    {
                      k: "phone",
                      label: "Mobile Number *",
                      icon: "call-outline",
                      kb: "phone-pad",
                    },
                    {
                      k: "email",
                      label: "Email (optional)",
                      icon: "mail-outline",
                      kb: "email-address",
                    },
                  ].map((fi) => (
                    <View key={fi.k} style={s.field}>
                      <Text style={s.label}>{fi.label}</Text>
                      <View style={s.inputWrap}>
                        <Ionicons
                          name={fi.icon}
                          size={18}
                          color={colors.textSecondary}
                        />
                        <TextInput
                          style={s.input}
                          placeholder={
                            fi.k === "name"
                              ? "Full name"
                              : fi.k === "phone"
                                ? "+91 98xxxxxxxx"
                                : "email@example.com"
                          }
                          placeholderTextColor={colors.textDisabled}
                          keyboardType={fi.kb}
                          autoCapitalize={fi.k === "email" ? "none" : "words"}
                          value={p[fi.k]}
                          onChangeText={(v) => setPassenger(i, fi.k, v)}
                        />
                      </View>
                    </View>
                  ))}
                  <Text style={s.label}>Gender *</Text>
                  <View style={s.genderRow}>
                    {["Male", "Female", "Other"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          s.genderChip,
                          p.gender === g && s.genderChipActive,
                        ]}
                        onPress={() =>
                          setPassenger(i, "gender", p.gender === g ? "" : g)
                        }
                      >
                        <Text
                          style={[
                            s.genderText,
                            p.gender === g && { color: "#fff" },
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── STEP 2: Seat Map ── */}
          {step === 2 && (
            <>
              <Text style={s.sectionLabel}>· Choose Your Seat(s) ·</Text>
              <View style={s.seatProgress}>
                <Text style={s.seatProgressTxt}>
                  {selectedSeats.length} of {numberOfSeats} seat(s) selected
                </Text>
                <View style={s.seatProgressBar}>
                  <View
                    style={[
                      s.seatProgressFill,
                      {
                        width: `${(selectedSeats.length / numberOfSeats) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              {seatMapLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      color: colors.textSecondary,
                      marginTop: 10,
                    }}
                  >
                    Loading seat map…
                  </Text>
                </View>
              ) : seatMapData ? (
                <SeatMap
                  totalSeats={seatMapData.totalSeats}
                  seatStructure={seatMapData.seatStructure}
                  occupiedSeats={seatMapData.occupiedSeats}
                  selectedSeats={selectedSeats}
                  onToggle={toggleSeat}
                  maxSelect={numberOfSeats}
                />
              ) : null}
            </>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <>
              <Text style={s.sectionLabel}>· Review & Confirm ·</Text>
              <View style={s.review}>
                <PassengerSection label="Passenger 1" data={form} />
                {extraPassengers.map((p, i) => (
                  <PassengerSection
                    key={i}
                    label={`Passenger ${i + 2}`}
                    data={p}
                  />
                ))}
                <View style={s.reviewMeta}>
                  <RevItem
                    icon="grid"
                    label="Seat Nos."
                    value={
                      selectedSeats.sort((a, b) => a - b).join(", ") || "—"
                    }
                  />
                  <RevItem
                    icon="people"
                    label="Seats"
                    value={String(numberOfSeats)}
                  />
                </View>
                {/* Coupon section */}
                <View style={s.couponSection}>
                  <View style={s.couponHeader}>
                    <Ionicons name="pricetag" size={14} color={colors.primary} />
                    <Text style={s.couponTitle}>Have a Coupon?</Text>
                  </View>
                  {couponApplied ? (
                    <View style={s.couponApplied}>
                      <View style={s.couponAppliedLeft}>
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <View>
                          <Text style={s.couponCode}>{couponApplied.code}</Text>
                          <Text style={s.couponSaving}>You save ₹{couponApplied.discountAmount}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={removeCoupon} style={s.couponRemove}>
                        <Ionicons name="close" size={14} color={colors.primary} />
                        <Text style={s.couponRemoveTxt}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.couponInputRow}>
                      <TextInput
                        style={s.couponInput}
                        placeholder="Enter coupon code"
                        placeholderTextColor={colors.textDisabled}
                        value={couponCode}
                        onChangeText={v => setCouponCode(v.toUpperCase())}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={[s.couponApplyBtn, (!couponCode.trim() || couponChecking) && { opacity: 0.5 }]}
                        onPress={applyCoupon}
                        disabled={!couponCode.trim() || couponChecking}
                      >
                        {couponChecking
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={s.couponApplyTxt}>Apply</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Price breakdown */}
                <View style={s.priceBreakdown}>
                  <View style={s.priceRow}>
                    <Text style={s.priceRowLabel}>Subtotal ({numberOfSeats} seat{numberOfSeats > 1 ? "s" : ""})</Text>
                    <Text style={s.priceRowValue}>₹{subtotal}</Text>
                  </View>
                  {discount > 0 && (
                    <View style={s.priceRow}>
                      <Text style={[s.priceRowLabel, { color: "#16A34A" }]}>Coupon Discount</Text>
                      <Text style={[s.priceRowValue, { color: "#16A34A" }]}>− ₹{discount}</Text>
                    </View>
                  )}
                </View>

                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total Amount</Text>
                  <Text style={s.totalValue}>₹{total || tour?.price || "—"}</Text>
                </View>

                {/* Wallet payment toggle */}
                {walletBalance > 0 && (
                  <TouchableOpacity
                    style={[s.walletRow, useWallet && s.walletRowActive]}
                    onPress={() => setUseWallet(!useWallet)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.walletIcon, useWallet && { backgroundColor: colors.primary }]}>
                      <Ionicons name="wallet" size={18} color={useWallet ? "#fff" : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.walletTitle}>Pay with Wallet</Text>
                      <Text style={s.walletBal}>Balance: ₹{walletBalance.toLocaleString("en-IN")}</Text>
                      {useWallet && (
                        <Text style={s.walletNote}>
                          {walletBalance >= total
                            ? "Full amount covered by wallet"
                            : `₹${Math.min(walletBalance, total).toLocaleString("en-IN")} from wallet + ₹${Math.max(0, total - walletBalance).toLocaleString("en-IN")} via Razorpay`}
                        </Text>
                      )}
                    </View>
                    <View style={[s.walletCheck, useWallet && s.walletCheckActive]}>
                      {useWallet && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                )}

                <View style={s.payNote}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                  <Text style={s.payNoteText}>
                    Payment is processed securely. Your booking is created only after successful payment.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[s.stickyWrap, { paddingBottom: insets.bottom }]}>
          <View style={s.sticky}>
            {step > 1 && (
              <TouchableOpacity
                style={s.backStepBtn}
                onPress={() => setStep(step - 1)}
              >
                <Ionicons
                  name="arrow-back"
                  size={16}
                  color={colors.secondary}
                />
                <Text style={s.backStepText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity
                style={[s.nextCta, { flex: 1 }]}
                onPress={() => {
                  if (validateStep()) setStep(step + 1);
                }}
              >
                <Text style={s.nextText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.nextCta, { flex: 1 }]}
                onPress={onConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="#fff" />
                    <Text style={s.nextText}>Confirm & Pay ₹{total || subtotal || ""}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <RazorpayCheckout
        visible={!!checkout}
        options={checkout}
        onSuccess={onPaid}
        onClose={() => setCheckout(null)}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

function PassengerSection({ label, data }) {
  return (
    <View style={rv.section}>
      <Text style={rv.sectionLabel}>{label}</Text>
      <RevItem icon="person" label="Name" value={data.name} />
      <RevItem icon="call" label="Mobile" value={data.phone} />
      {data.email ? (
        <RevItem icon="mail" label="Email" value={data.email} />
      ) : null}
      <RevItem icon="male-female" label="Gender" value={data.gender || "—"} />
    </View>
  );
}

function RevItem({ icon, label, value }) {
  return (
    <View style={rv.row}>
      <View style={rv.iconWrap}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={rv.label}>{label}</Text>
      <Text style={rv.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const rv = StyleSheet.create({
  section: { marginBottom: 4 },
  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    width: 90,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "right",
  },
});

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.secondary,
  },

  stepper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 0,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepLine: {
    width: 52,
    height: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
    marginTop: 15,
  },
  stepLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 60,
  },
  stepLabelActive: { color: colors.primary },

  summary: {
    padding: 20,
    borderRadius: radius.xxl,
    overflow: "hidden",
    marginBottom: 20,
  },
  decCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -30,
    right: -20,
  },
  decCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.07)",
    bottom: -20,
    left: 10,
  },
  summaryTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  summaryMeta: { color: "#FFE9C0", fontFamily: fonts.body, fontSize: 12 },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  priceBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  priceBadgeTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 12 },
  totalBadge: { color: "#FFE9C0", fontFamily: fonts.bodyBold, fontSize: 14 },

  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginBottom: 16,
  },

  field: { marginBottom: 14 },
  label: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    height: 54,
  },

  genderRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  genderChip: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flexDirection: "row",
    backgroundColor: colors.surface,
  },
  genderChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  seatCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  seatBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.soft,
  },
  seatValueWrap: { alignItems: "center" },
  seatValue: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: colors.secondary,
    minWidth: 40,
    textAlign: "center",
  },
  seatValueSub: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textDisabled,
    letterSpacing: 1,
  },
  priceCalc: { flex: 1, alignItems: "flex-end" },
  priceCalcTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceCalcTotal: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.primary,
  },

  seatProgress: { marginBottom: 14 },
  seatProgressTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  seatProgressBar: {
    height: 4,
    backgroundColor: colors.borderSubtle,
    borderRadius: 2,
    overflow: "hidden",
  },
  seatProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  review: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: radius.xxl,
    ...shadow.soft,
  },
  reviewMeta: { marginTop: 8 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  totalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary,
  },
  totalValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.primary,
  },
  payNote: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    alignItems: "flex-start",
  },
  payNoteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#16A34A",
    flex: 1,
    lineHeight: 18,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    marginTop: 12,
  },
  walletRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + "30",
  },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  walletTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
  walletBal: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  walletNote: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary, marginTop: 3 },
  walletCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  passengerCard: {
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: colors.elevated || "#FFF4EC",
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  passengerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  passengerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  passengerBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#fff",
  },
  passengerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary,
  },

  // Coupon styles
  couponSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.primaryLight || "#FFF4EC",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    gap: 10,
  },
  couponHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  couponTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.secondary },
  couponInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  couponInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    letterSpacing: 1,
  },
  couponApplyBtn: {
    height: 42,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  couponApplyTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  couponApplied: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  couponAppliedLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponCode: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#16A34A", letterSpacing: 1 },
  couponSaving: { fontFamily: fonts.body, fontSize: 11, color: "#16A34A" },
  couponRemove: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary + "40" },
  couponRemoveTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  priceBreakdown: { marginTop: 12, gap: 6 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceRowLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  priceRowValue: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },

  stickyWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sticky: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  backStepText: {
    fontFamily: fonts.bodyBold,
    color: colors.secondary,
    fontSize: 13,
  },
  nextCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  nextText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
});
