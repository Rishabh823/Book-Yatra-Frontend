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
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import {
  bookings as bookingsApi,
  api,
  coupons as couponsApi,
} from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { fmtDate, fmtCurrency } from "../../lib/utils";
import { useLang } from "../../lib/LanguageContext";
import RazorpayCheckout from "../../components/RazorpayCheckout";

const STATUS_META = {
  confirmed: {
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "checkmark-circle",
    label: "Confirmed",
  },
  paid: { color: "#16A34A", bg: "#F0FDF4", icon: "card", label: "Paid" },
  pending: { color: "#D97706", bg: "#FFFBEB", icon: "time", label: "Pending" },
  cancelled: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "close-circle",
    label: "Cancelled",
  },
  checked_in: {
    color: "#0284C7",
    bg: "#EFF6FF",
    icon: "scan",
    label: "Checked In",
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
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [refundText, setRefundText] = useState("");
  const [refundSending, setRefundSending] = useState(false);
  const [refundSent, setRefundSent] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [showCouponPanel, setShowCouponPanel] = useState(false);
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

    bookingsApi
      .qrCode(id)
      .then((res) => setQrDataUrl(res?.data || res))
      .catch(() => null);
  }, [id]);

  const onRequestRefund = async () => {
    if (!refundText.trim()) {
      showToast("Please describe your reason for the refund request.");
      return;
    }
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

  const shareQR = async () => {
    if (!qrDataUrl) {
      showToast("QR code is still loading, please wait.", "info");
      return;
    }
    try {
      if (Platform.OS === "web") {
        // Web: trigger a download of the QR image
        const a = document.createElement("a");
        a.href = qrDataUrl;
        a.download = `ticket-${String(id).slice(-8).toUpperCase()}.png`;
        a.click();
        return;
      }
      // Native: write base64 to a temp file and share
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const fileUri =
        FileSystem.cacheDirectory + `qr-ticket-${String(id).slice(-8)}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Share QR Ticket",
        });
      } else {
        await Share.share({ url: fileUri });
      }
    } catch {
      showToast("Could not share QR. Please try again.", "error");
    }
  };

  const onPayNow = () => {
    setCouponCode("");
    setCouponApplied(null);
    setShowCouponPanel(true);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    try {
      const totalAmount = booking.totalAmount || booking.amount || 0;
      const res = await couponsApi.validate({
        code: couponCode.trim(),
        amount: totalAmount,
      });
      const data = res?.data || res;
      setCouponApplied({
        code: couponCode.trim(),
        discountAmount: data.discountAmount || 0,
        message: data.message || "Coupon applied!",
      });
      showToast(data.message || "Coupon applied!", "success");
    } catch (e) {
      showToast(e.message || "Invalid coupon code.", "error");
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
  };

  const proceedToPayment = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      const discount = couponApplied?.discountAmount || 0;
      const originalAmount = booking.totalAmount || booking.amount || 0;
      const finalAmount = Math.max(0, originalAmount - discount);
      const orderRes = await bookingsApi.createOrder({
        bookingId: id,
        couponCode: couponApplied?.code || undefined,
      });
      const order = orderRes?.data || orderRes;
      if (order?.orderId && order?.key) {
        setCheckout({
          key: order.key,
          orderId: order.orderId,
          amount: order.amount ?? finalAmount * 100,
          currency: order.currency || "INR",
          name: "Book Yatra",
          description: booking.tourTitle || "Yatra",
          prefill: {
            name: booking.name,
            email: booking.email || "",
            contact: booking.phone || "",
          },
        });
        setShowCouponPanel(false);
      } else {
        showToast(
          "Payment gateway not configured. Please pay at counter.",
          "info",
        );
      }
    } catch (e) {
      showToast(e.message || "Could not initiate payment.", "error");
    } finally {
      setPaying(false);
    }
  };

  const onPaid = async ({ paymentId, orderId, signature }) => {
    setCheckout(null);
    setPaying(true);
    try {
      await bookingsApi.verifyPayment({
        bookingId: id,
        paymentId,
        orderId,
        signature,
      });
      showToast("Payment successful! Booking confirmed.", "success");
      // Refresh booking details
      const res = await bookingsApi.byId(id);
      setBooking(res?.data || res);
    } catch (e) {
      showToast(
        e.message || "Payment received but verification failed.",
        "error",
      );
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure? Cancellation is subject to the operator's refund policy.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await api.post(`/bookings/${id}/cancel`);
              showToast("Booking cancelled successfully.", "success");
              const res = await bookingsApi.byId(id);
              setBooking(res?.data || res);
            } catch (e) {
              showToast(e.message || "Failed to cancel booking.", "error");
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
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
          onPress={shareQR}
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

        {/* Action buttons — Pay Now / Cancel */}
        {!["cancelled"].includes(status) && (
          <View style={s.actionBar}>
            {status === "pending" && booking.paymentStatus !== "paid" && (
              <TouchableOpacity
                style={[s.actionBtn, s.payBtn]}
                onPress={onPayNow}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="#fff" />
                    <Text style={s.payBtnTxt}>
                      Pay Now —{" "}
                      {fmtCurrency(booking.totalAmount || booking.amount)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {!["checked_in", "cancelled"].includes(status) && (
              <TouchableOpacity
                style={[s.actionBtn, s.cancelBtn]}
                onPress={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={16}
                      color="#DC2626"
                    />
                    <Text style={s.cancelBtnTxt}>Cancel Booking</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Cancel confirmation panel */}
        {showCancelConfirm && (
          <View style={s.cancelConfirmPanel}>
            <Ionicons name="warning" size={28} color="#D97706" />
            <Text style={s.cancelConfirmTitle}>Cancel Booking?</Text>
            <Text style={s.cancelConfirmSub}>
              Cancellation is subject to the operator's refund policy. This
              cannot be undone.
            </Text>
            <View style={s.cancelConfirmBtns}>
              <TouchableOpacity
                style={s.keepBtn}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={s.keepBtnTxt}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmCancelBtn}
                onPress={confirmCancel}
              >
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                <Text style={s.confirmCancelBtnTxt}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Coupon panel — shown when user taps Pay Now */}
        {showCouponPanel && (
          <View style={s.couponPanel}>
            <Text style={s.couponPanelTitle}>Apply Coupon</Text>
            {couponApplied ? (
              <View style={s.couponAppliedRow}>
                <View style={s.couponAppliedInfo}>
                  <Ionicons name="pricetag" size={15} color="#16A34A" />
                  <Text style={s.couponAppliedCode}>{couponApplied.code}</Text>
                  <Text style={s.couponAppliedDiscount}>
                    −{fmtCurrency(couponApplied.discountAmount)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={removeCoupon}
                  style={s.couponRemoveBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.couponRow}>
                <TextInput
                  style={s.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.textDisabled}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[
                    s.couponApplyBtn,
                    (!couponCode.trim() || couponChecking) && { opacity: 0.5 },
                  ]}
                  onPress={applyCoupon}
                  disabled={couponChecking || !couponCode.trim()}
                >
                  {couponChecking ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.couponApplyBtnTxt}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={s.couponSummary}>
              <View style={s.couponSummaryRow}>
                <Text style={s.couponSummaryLabel}>Booking Amount</Text>
                <Text style={s.couponSummaryValue}>
                  {fmtCurrency(booking.totalAmount || booking.amount)}
                </Text>
              </View>
              {couponApplied && (
                <View style={s.couponSummaryRow}>
                  <Text style={[s.couponSummaryLabel, { color: "#16A34A" }]}>
                    Discount
                  </Text>
                  <Text style={[s.couponSummaryValue, { color: "#16A34A" }]}>
                    −{fmtCurrency(couponApplied.discountAmount)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  s.couponSummaryRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: colors.borderSubtle,
                    marginTop: 6,
                    paddingTop: 10,
                  },
                ]}
              >
                <Text style={s.couponTotalLabel}>Total Payable</Text>
                <Text style={s.couponTotalValue}>
                  {fmtCurrency(
                    Math.max(
                      0,
                      (booking.totalAmount || booking.amount || 0) -
                        (couponApplied?.discountAmount || 0),
                    ),
                  )}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.actionBtn, s.payBtn, paying && { opacity: 0.6 }]}
              onPress={proceedToPayment}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={16} color="#fff" />
                  <Text style={s.payBtnTxt}>
                    Proceed to Pay —{" "}
                    {fmtCurrency(
                      Math.max(
                        0,
                        (booking.totalAmount || booking.amount || 0) -
                          (couponApplied?.discountAmount || 0),
                      ),
                    )}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCouponPanel(false)}
              style={s.couponCancelRow}
            >
              <Text style={s.couponCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Ticket — only shown after payment */}
        {booking.paymentStatus === "paid" ||
        ["confirmed", "checked_in"].includes(status) ? (
          <View style={s.qrCard}>
            <View style={s.qrHeader}>
              <Ionicons name="qr-code" size={18} color={colors.secondary} />
              <Text style={s.qrTitle}>Your Boarding Pass</Text>
            </View>
            <Text style={s.qrSub}>
              Show this QR at boarding — volunteer will scan it
            </Text>
            <View style={s.qrBox}>
              {qrDataUrl ? (
                <Image
                  source={{ uri: qrDataUrl }}
                  style={s.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={s.qrPlaceholder}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={s.qrPlaceholderTxt}>Loading QR…</Text>
                </View>
              )}
            </View>
            <View style={s.qrActions}>
              <TouchableOpacity
                style={[s.qrBtn, { backgroundColor: colors.primary }]}
                onPress={shareQR}
                disabled={!qrDataUrl}
              >
                <Ionicons
                  name={
                    Platform.OS === "web"
                      ? "download-outline"
                      : "share-social-outline"
                  }
                  size={16}
                  color="#fff"
                />
                <Text style={[s.qrBtnTxt, { color: "#fff" }]}>
                  {Platform.OS === "web" ? "Download QR" : "Share QR"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.pendingQrCard}>
            <View style={s.pendingQrIcon}>
              <Ionicons
                name="lock-closed"
                size={28}
                color={colors.textDisabled}
              />
            </View>
            <Text style={s.pendingQrTitle}>Boarding Pass Locked</Text>
            <Text style={s.pendingQrSub}>
              Complete payment to unlock your QR code and boarding pass
            </Text>
          </View>
        )}

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
        {(booking.paymentStatus === "paid" ||
          booking.status === "confirmed") && (
          <>
            <Text style={s.sectionLabel}>· Refund / Cancellation ·</Text>
            <View style={s.section}>
              {refundSent || booking.refundRequestStatus === "pending" ? (
                <View style={s.refundSentWrap}>
                  <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                  <Text style={s.refundSentTitle}>
                    Refund Request Submitted
                  </Text>
                  <Text style={s.refundSentSub}>
                    Your request has been sent to the operator. They will review
                    it and contact you.
                  </Text>
                  {booking.refundRequestStatus === "approved" && (
                    <View style={s.refundStatusBadge}>
                      <Text style={[s.refundStatusText, { color: "#16A34A" }]}>
                        Approved by operator
                      </Text>
                    </View>
                  )}
                  {booking.refundRequestStatus === "rejected" && (
                    <View
                      style={[
                        s.refundStatusBadge,
                        { backgroundColor: "#FEF2F2" },
                      ]}
                    >
                      <Text style={[s.refundStatusText, { color: "#DC2626" }]}>
                        Request declined by operator
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <View style={s.refundInfoRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#D97706"
                    />
                    <Text style={s.refundInfoText}>
                      Payment is non-refundable by default. You may request a
                      refund — the operator will decide.
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
                    {refundSending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="return-down-back-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={s.refundBtnText}>Request Refund</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        <Text style={s.mantra}>{t.jai} 🙏</Text>
      </ScrollView>
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

  refundInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  refundInfoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
  },
  refundLabel: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  refundInput: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    minHeight: 80,
    marginBottom: 14,
  },
  refundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D97706",
    height: 48,
    borderRadius: radius.pill,
  },
  refundBtnText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  refundSentWrap: { alignItems: "center", gap: 8, paddingVertical: 8 },
  refundSentTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  refundSentSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  refundStatusBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  refundStatusText: { fontFamily: fonts.bodyBold, fontSize: 12 },

  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryText: { color: "#fff", fontFamily: fonts.bodyMedium, fontSize: 13 },

  actionBar: { gap: 10, marginBottom: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.pill,
  },
  payBtn: { backgroundColor: colors.primary, ...shadow.card },
  payBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 15 },
  cancelBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  cancelBtnTxt: { color: "#DC2626", fontFamily: fonts.bodyBold, fontSize: 14 },

  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    ...shadow.card,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  qrTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.secondary },
  qrSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  qrBox: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  qrImage: { width: 190, height: 190 },
  qrPlaceholder: { alignItems: "center", gap: 8 },
  qrPlaceholderTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  qrActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
  },
  qrBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  pendingQrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 28,
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
  },
  pendingQrIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pendingQrTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pendingQrSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  couponPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 20,
    marginBottom: 20,
    gap: 14,
    ...shadow.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  couponPanelTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.secondary,
  },
  couponRow: { flexDirection: "row", gap: 10 },
  couponInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    letterSpacing: 1,
  },
  couponApplyBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  couponApplyBtnTxt: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  couponAppliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  couponAppliedInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponAppliedCode: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#15803D",
    letterSpacing: 1,
  },
  couponAppliedDiscount: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#16A34A",
  },
  couponRemoveBtn: { padding: 2 },
  couponSummary: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  couponSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponSummaryLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  couponSummaryValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  couponTotalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  couponTotalValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.secondary,
  },
  couponCancelRow: { alignItems: "center", paddingVertical: 4 },
  couponCancelTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  cancelConfirmPanel: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.xxl,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    ...shadow.soft,
  },
  cancelConfirmTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  cancelConfirmSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  cancelConfirmBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  keepBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  keepBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
  },
  confirmCancelBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#fff",
  },
});
