import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const STATUS_CONFIG = {
  confirmed: { bg: "#DCFCE7", color: "#16A34A" },
  cancelled: { bg: "#FEE2E2", color: "#DC2626" },
  pending: { bg: "#FEF3C7", color: "#D97706" },
};

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function QRTicketScreen() {
  const { bookingId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get("/bookings/" + bookingId)
        .then((res) => {
          const b = res.data || res;
          setBooking(b);
          // Fetch QR code from backend
          return api.get("/bookings/" + bookingId + "/qr");
        })
        .then((qrRes) => {
          const url = qrRes.data || qrRes;
          if (typeof url === "string" && url.startsWith("data:"))
            setQrDataUrl(url);
        })
        .catch(() => showToast("Failed to load ticket", "error"))
        .finally(() => setLoading(false));
    }, [bookingId]),
  );

  const handleShare = async () => {
    if (!booking) return;
    setSharing(true);
    try {
      const tourTitle = booking.tourId?.title || "Tour";
      const shortId = booking.bookingId || booking._id?.slice(-8).toUpperCase();
      const startDate = fmtDate(booking.tourId?.startDate);
      const from = booking.tourId?.source || "—";
      const to = booking.tourId?.destination || "—";
      const passengers = booking.seats?.length || 1;
      const amount = booking.totalAmount ? "₹" + booking.totalAmount : "—";

      const message =
        `*Shyam Sawariya Parivar — Booking Confirmed*\n\n` +
        `Tour: ${tourTitle}\n` +
        `Route: ${from} → ${to}\n` +
        `Date: ${startDate}\n` +
        `Passengers: ${passengers}\n` +
        `Amount: ${amount}\n` +
        `Booking ID: #${shortId}\n` +
        `Status: ${(booking.status || "pending").toUpperCase()}\n\n` +
        `Please carry this booking ID for verification at the time of departure.`;

      await Share.share({ message, title: "My Tour Ticket" });
    } catch {}
    setSharing(false);
  };

  const downloadPDF = async () => {
    try {
      await api.get("/documents/ticket/" + bookingId + "/pdf");
      showToast("Your ticket PDF has been generated. Check downloads.", "success");
    } catch {
      showToast("Failed to generate PDF", "error");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) return null;

  const status = booking.status || "pending";
  const statusStyle = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const passengers = booking.seats?.length || 1;
  const shortId = (
    booking.bookingId ||
    booking._id?.slice(-8) ||
    ""
  ).toUpperCase();
  const departureTime = fmtTime(booking.tourId?.departureTime);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>My Ticket</Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareBtn}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="share-outline" size={20} color="white" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Ticket card */}
        <View style={[styles.ticket, shadow.card]}>
          {/* Gradient header */}
          <LinearGradient
            colors={["#D95D39", "#5C1615"]}
            style={styles.ticketHeader}
          >
            <Text style={styles.appName}>Shyam Sawariya Parivar</Text>
            <Text style={styles.tourTitle} numberOfLines={2}>
              {booking.tourId?.title || "Tour"}
            </Text>
            <View style={styles.routeRow}>
              <Text style={styles.routeCity}>
                {booking.tourId?.source || "—"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.routeCity}>
                {booking.tourId?.destination || "—"}
              </Text>
            </View>
          </LinearGradient>

          {/* Dotted tear separator */}
          <View style={styles.separator}>
            <View style={styles.cutCircleLeft} />
            <View style={styles.dottedLine} />
            <View style={styles.cutCircleRight} />
          </View>

          {/* Booking ID banner */}
          <View style={styles.idBanner}>
            <Text style={styles.idLabel}>BOOKING ID</Text>
            <Text style={styles.idValue}>#{shortId}</Text>
            <View
              style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
            >
              <Text
                style={[styles.statusPillText, { color: statusStyle.color }]}
              >
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.qrSection}>
            {qrDataUrl ? (
              <Image
                source={{ uri: qrDataUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons
                  name="qr-code-outline"
                  size={64}
                  color={colors.textDisabled}
                />
              </View>
            )}
            <Text style={styles.qrHint}>Scan at departure gate</Text>
          </View>

          {/* Dotted separator 2 */}
          <View style={styles.separator}>
            <View style={styles.cutCircleLeft} />
            <View style={styles.dottedLine} />
            <View style={styles.cutCircleRight} />
          </View>

          {/* Trip details grid */}
          <View style={styles.detailsGrid}>
            <InfoRow
              icon="calendar-outline"
              label="Departure Date"
              value={fmtDate(booking.tourId?.startDate)}
            />
            {departureTime ? (
              <InfoRow
                icon="time-outline"
                label="Departure Time"
                value={departureTime}
              />
            ) : null}
            <InfoRow
              icon="people-outline"
              label="Passengers"
              value={passengers + " passenger" + (passengers > 1 ? "s" : "")}
            />
            <InfoRow
              icon="cash-outline"
              label="Total Amount"
              value={booking.totalAmount ? "₹" + booking.totalAmount : "—"}
            />
            {booking.paymentStatus ? (
              <InfoRow
                icon="card-outline"
                label="Payment"
                value={
                  booking.paymentStatus.charAt(0).toUpperCase() +
                  booking.paymentStatus.slice(1)
                }
              />
            ) : null}
          </View>

          {/* Show seat numbers if present */}
          {booking.seats?.length > 0 && (
            <View style={styles.seatsSection}>
              <Text style={styles.seatsLabel}>Seat Numbers</Text>
              <View style={styles.seatsRow}>
                {booking.seats.map((s, i) => (
                  <View key={i} style={styles.seatBadge}>
                    <Text style={styles.seatText}>{s.seatNumber || s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.ticketFooter}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={colors.textDisabled}
            />
            <Text style={styles.footerNote}>
              Present this booking ID at the time of departure for verification.
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, shadow.soft]}
            onPress={handleShare}
            disabled={sharing}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, shadow.soft]}
            onPress={downloadPDF}
          >
            <Ionicons
              name="document-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionText}>PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Live tracking CTA */}
        {booking.tourId?._id ? (
          <TouchableOpacity
            style={[styles.trackBtn, shadow.soft]}
            onPress={() =>
              router.push("/live-tracking?tourId=" + booking.tourId._id)
            }
          >
            <Ionicons name="location" size={18} color="white" />
            <Text style={styles.trackText}>Track Live</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  ticketHeader: { padding: 20, gap: 6 },
  appName: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tourTitle: {
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: "white",
    marginTop: 2,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  routeCity: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -1,
  },
  cutCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg,
    marginLeft: -10,
    zIndex: 1,
  },
  dottedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
    borderStyle: "dashed",
    marginVertical: 0,
  },
  cutCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg,
    marginRight: -10,
    zIndex: 1,
  },
  idBanner: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
    backgroundColor: colors.primaryLight,
  },
  idLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  idValue: {
    fontFamily: "Philosopher_700Bold",
    fontSize: 32,
    color: colors.secondary,
    letterSpacing: 2,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  qrSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
    backgroundColor: "white",
  },
  qrImage: { width: 180, height: 180 },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  qrHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDisabled,
    letterSpacing: 0.5,
  },
  detailsGrid: { padding: 16, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  seatsSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  seatsLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  seatsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  seatText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  ticketFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerNote: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    lineHeight: 16,
  },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
  },
  actionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  trackBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "white" },
});
