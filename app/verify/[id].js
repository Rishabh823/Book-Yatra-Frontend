import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "../../lib/ThemeContext";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://shyamsawariyaparivar.com/api";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

function Row({ label, value, highlight }) {
  const colors = useColors();
  const rs = useMemo(() => StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
    rowLabel: { fontSize: 13, color: colors.textSecondary },
    rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  }), [colors]);
  return (
    <View style={rs.row}>
      <Text style={rs.rowLabel}>{label}</Text>
      <Text style={[rs.rowValue, highlight && { color: "#16A34A", fontWeight: "700" }]}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function VerifyBooking() {
  const { id } = useLocalSearchParams();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/bookings/verify/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.message || "Booking not found");
      })
      .catch(() => setError("Could not load booking details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#C8601A" />
        <Text style={s.loadingText}>Verifying booking…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.center}>
        <View style={[s.statusCircle, { backgroundColor: "#FEE2E2" }]}>
          <Ionicons name="close-circle" size={48} color="#DC2626" />
        </View>
        <Text style={[s.statusTitle, { color: "#DC2626" }]}>Invalid QR Code</Text>
        <Text style={s.statusSub}>{error || "This booking could not be found."}</Text>
      </View>
    );
  }

  const isPaid = data.paymentStatus === "paid";
  const isValid = ["confirmed", "paid", "checked_in"].includes(data.status) && isPaid;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={s.header}>
        <Text style={s.headerOrg}>Shyam Sawariya Parivar</Text>
        <Text style={s.headerTitle}>Booking Verification</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Main status card */}
        <View style={[s.statusCard, { borderColor: isValid ? "#16A34A" : "#D97706" }]}>
          <View
            style={[
              s.statusCircle,
              { backgroundColor: isValid ? "#F0FDF4" : "#FFFBEB" },
            ]}
          >
            <Ionicons
              name={isValid ? "checkmark-circle" : "time"}
              size={56}
              color={isValid ? "#16A34A" : "#D97706"}
            />
          </View>
          <Text
            style={[
              s.statusTitle,
              { color: isValid ? "#16A34A" : "#D97706" },
            ]}
          >
            {isValid ? "VALID TICKET" : "PAYMENT PENDING"}
          </Text>
          <Text style={s.statusSub}>
            {isValid
              ? "This is a genuine confirmed booking"
              : "Payment has not been completed for this booking"}
          </Text>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor: isValid ? "#DCFCE7" : "#FEF3C7",
              },
            ]}
          >
            <Text
              style={[
                s.statusPillText,
                { color: isValid ? "#15803D" : "#92400E" },
              ]}
            >
              {(data.status || "pending").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Check-in status */}
        {data.isCheckedIn && (
          <View style={s.checkedInBanner}>
            <Ionicons name="scan" size={18} color="#0284C7" />
            <Text style={s.checkedInText}>
              Checked in{data.checkedInAt ? ` on ${fmtDate(data.checkedInAt)}` : ""}
            </Text>
          </View>
        )}

        {/* Booking details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Booking Details</Text>
          <Row label="Booking ID" value={`#${data.bookingId}`} />
          <Row label="Passenger" value={data.passengerName} />
          <Row label="Seats" value={`${data.numberOfSeats} person(s)`} />
          {data.seatNumber && <Row label="Seat Number" value={data.seatNumber} />}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Tour Details</Text>
          <Row label="Tour" value={data.tourTitle} />
          <Row label="From" value={data.source} />
          <Row label="To" value={data.destination} />
          <Row label="Departure" value={fmtDate(data.startDate)} />
          {data.endDate && <Row label="Return" value={fmtDate(data.endDate)} />}
        </View>

        <Text style={s.footer}>
          Jai Shree Shyam 🙏{"\n"}
          Shyam Sawariya Parivar
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 32,
    gap: 12,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    gap: 4,
  },
  headerOrg: {
    color: "rgba(255,233,192,0.75)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "System",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  statusCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 1 },
  statusSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  statusPill: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 100,
    marginTop: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  checkedInBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  checkedInText: { fontSize: 13, color: "#0284C7", fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C8601A",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  footer: {
    textAlign: "center",
    fontSize: 14,
    color: "#5C1615",
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 8,
  },
});
