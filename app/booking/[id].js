import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { bookings as bookingsApi } from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { fmtDate, fmtCurrency } from "../../lib/utils";
import { useLang } from "../../lib/LanguageContext";

const STATUS_META = {
  confirmed: {
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "checkmark-circle",
    label: "Confirmed",
  },
  pending: { color: "#D97706", bg: "#FFFBEB", icon: "time", label: "Pending" },
  cancelled: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "close-circle",
    label: "Cancelled",
  },
};

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function BookingDetail() {
  const router = useRouter();
  const { t } = useLang();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refundText, setRefundText] = useState("");
  const [refundSending, setRefundSending] = useState(false);
  const [refundSent, setRefundSent] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (!id) return;
    bookingsApi
      .byId(id)
      .then((res) => {
        const b = res?.data || res;
        setBooking(b);
        if (b?.refundRequestStatus === "pending") setRefundSent(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const onRequestRefund = async () => {
    if (!refundText.trim()) { showToast("Please describe your reason for the refund request."); return; }
    setRefundSending(true);
    try {
      await bookingsApi.requestRefund(id, refundText.trim());
      setRefundSent(true);
      showToast("Refund request sent to the operator.", "success");
    } catch (e) {
      showToast(e.message || "Failed to send refund request.");
    } finally {
      setRefundSending(false);
    }
  };

  const shareTicket = async () => {
    if (!booking) return;
    await Share.share({
      message: `🙏 Jai Shree Shyam!\nBooking: ${booking.tourTitle || "Yatra"}\nDate: ${fmtDate(booking.tourStartDate || booking.tour?.startDate)}\nSeats: ${booking.numberOfSeats || booking.seats || 1}\nStatus: ${booking.status}\nID: ${String(id).slice(-8).toUpperCase()}`,
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top"]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg }}
        edges={["top"]}
      >
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.secondary} />
          </TouchableOpacity>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text
            style={{ fontFamily: fonts.bodyBold, color: colors.textSecondary }}
          >
            {error || "Booking not found"}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Text style={s.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = (booking.status || "pending").toLowerCase();
  const sm = STATUS_META[status] || STATUS_META.pending;
  const bookingId = String(id).slice(-8).toUpperCase();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View style={s.head}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconBtn}
          testID="booking-back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>Booking Details</Text>
        <TouchableOpacity
          onPress={shareTicket}
          style={s.iconBtn}
          testID="booking-share"
        >
          <Ionicons name="share-outline" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket header */}
        <LinearGradient
          colors={[colors.secondary, "#3D0D0C"]}
          style={s.ticketHero}
        >
          <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
            <Ionicons name={sm.icon} size={16} color={sm.color} />
            <Text style={[s.statusText, { color: sm.color }]}>{sm.label}</Text>
          </View>
          <Text style={s.tourName}>
            {booking.tourTitle || booking.tour?.title || "Yatra Booking"}
          </Text>
          <Text style={s.ticketId}>#{bookingId}</Text>

          {/* Dashed separator */}
          <View style={s.cutRow}>
            <View style={s.cutCircle} />
            <View style={s.dashed} />
            <View style={[s.cutCircle, { right: -12, left: "auto" }]} />
          </View>

          {/* Ticket meta grid */}
          <View style={s.metaGrid}>
            <TicketMeta
              label="Date"
              value={fmtDate(booking.tourStartDate || booking.tour?.startDate)}
            />
            <TicketMeta
              label="Seats"
              value={`${booking.numberOfSeats || booking.seats || 1} person(s)`}
            />
            <TicketMeta
              label="Amount"
              value={fmtCurrency(booking.totalAmount || booking.amount)}
            />
            <TicketMeta label="Payment" value={booking.paymentStatus || "—"} />
          </View>
        </LinearGradient>

        {/* Journey info */}
        <Text style={s.sectionLabel}>· Journey Details ·</Text>
        <View style={s.section}>
          <InfoRow
            icon="location"
            label="From"
            value={booking.source || booking.tour?.source}
          />
          <InfoRow
            icon="flag"
            label="To"
            value={booking.destination || booking.tour?.destination}
          />
          <InfoRow
            icon="bus"
            label="Bus"
            value={booking.busNumber || booking.tour?.busNumber}
          />
          <InfoRow
            icon="calendar"
            label="Departure"
            value={fmtDate(booking.tourStartDate || booking.tour?.startDate)}
          />
          <InfoRow
            icon="calendar-outline"
            label="Return"
            value={fmtDate(booking.tourEndDate || booking.tour?.endDate)}
          />
        </View>

        {/* Passenger info */}
        <Text style={s.sectionLabel}>· Passenger Details ·</Text>
        <View style={s.section}>
          <InfoRow
            icon="person"
            label="Name"
            value={booking.name || booking.user?.name}
          />
          <InfoRow
            icon="call"
            label="Phone"
            value={booking.phone || booking.user?.mobile}
          />
          <InfoRow
            icon="mail"
            label="Email"
            value={booking.email || booking.user?.email}
          />
        </View>

        {/* Payment info */}
        <Text style={s.sectionLabel}>· Payment Info ·</Text>
        <View style={s.section}>
          <InfoRow
            icon="cash"
            label="Total Amount"
            value={fmtCurrency(booking.totalAmount || booking.amount)}
          />
          <InfoRow
            icon="checkmark-done"
            label="Payment Status"
            value={booking.paymentStatus || "—"}
          />
          <InfoRow
            icon="receipt"
            label="Order ID"
            value={booking.razorpayOrderId || booking.paymentId || "—"}
          />
          <InfoRow
            icon="calendar"
            label="Booked On"
            value={fmtDate(booking.createdAt)}
          />
        </View>

        {/* Refund request — only after payment is done */}
        {(booking.paymentStatus === "paid" || booking.status === "confirmed") && (
          <>
            <Text style={s.sectionLabel}>· Refund / Cancellation ·</Text>
            <View style={s.section}>
              {refundSent || booking.refundRequestStatus === "pending" ? (
                <View style={s.refundSentWrap}>
                  <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                  <Text style={s.refundSentTitle}>Refund Request Submitted</Text>
                  <Text style={s.refundSentSub}>
                    Your request has been sent to the operator. They will review it and contact you.
                  </Text>
                  {booking.refundRequestStatus === "approved" && (
                    <View style={s.refundStatusBadge}>
                      <Text style={[s.refundStatusText, { color: "#16A34A" }]}>Approved by operator</Text>
                    </View>
                  )}
                  {booking.refundRequestStatus === "rejected" && (
                    <View style={[s.refundStatusBadge, { backgroundColor: "#FEF2F2" }]}>
                      <Text style={[s.refundStatusText, { color: "#DC2626" }]}>Request declined by operator</Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <View style={s.refundInfoRow}>
                    <Ionicons name="information-circle-outline" size={16} color="#D97706" />
                    <Text style={s.refundInfoText}>
                      Payment is non-refundable by default. You may request a refund — the operator will decide.
                    </Text>
                  </View>
                  <Text style={s.refundLabel}>Reason for refund request</Text>
                  <TextInput
                    style={s.refundInput}
                    placeholder="Describe why you need a refund..."
                    placeholderTextColor={colors.textDisabled}
                    multiline
                    numberOfLines={3}
                    value={refundText}
                    onChangeText={setRefundText}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[s.refundBtn, refundSending && { opacity: 0.6 }]}
                    onPress={onRequestRefund}
                    disabled={refundSending}
                  >
                    {refundSending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Ionicons name="return-down-back-outline" size={16} color="#fff" />
                          <Text style={s.refundBtnText}>Request Refund</Text>
                        </>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        <Text style={s.mantra}>{t.jai} 🙏</Text>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

function TicketMeta({ label, value }) {
  return (
    <View style={s.ticketMeta}>
      <Text style={s.ticketMetaLabel}>{label}</Text>
      <Text style={s.ticketMetaValue}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },

  ticketHero: {
    borderRadius: radius.xxl,
    padding: 24,
    marginBottom: 24,
    overflow: "hidden",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginBottom: 16,
  },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  tourName: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 22,
    textAlign: "center",
  },
  ticketId: {
    color: "rgba(255,233,192,0.8)",
    fontFamily: fonts.accent,
    fontSize: 11,
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 6,
  },

  cutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    position: "relative",
  },
  cutCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    position: "absolute",
    left: -12,
    zIndex: 1,
  },
  dashed: {
    flex: 1,
    borderTopWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
  },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  ticketMeta: { width: "45%" },
  ticketMetaLabel: {
    color: "rgba(255,233,192,0.7)",
    fontFamily: fonts.accent,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  ticketMetaValue: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 3,
  },

  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginBottom: 14,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 20,
    gap: 16,
    ...shadow.soft,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  infoValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },

  mantra: {
    textAlign: "center",
    marginTop: 8,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.secondary,
  },

  refundInfoRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFFBEB", borderRadius: radius.md, padding: 12, marginBottom: 14 },
  refundInfoText:   { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#92400E", lineHeight: 17 },
  refundLabel:      { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  refundInput:      { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.lg, padding: 12, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.bg, minHeight: 80, marginBottom: 14 },
  refundBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#D97706", height: 48, borderRadius: radius.pill },
  refundBtnText:    { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  refundSentWrap:   { alignItems: "center", gap: 8, paddingVertical: 8 },
  refundSentTitle:  { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  refundSentSub:    { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, textAlign: "center", lineHeight: 17 },
  refundStatusBadge:{ backgroundColor: "#F0FDF4", paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, marginTop: 4 },
  refundStatusText: { fontFamily: fonts.bodyBold, fontSize: 12 },

  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryText: { color: "#fff", fontFamily: fonts.bodyMedium, fontSize: 13 },
});
