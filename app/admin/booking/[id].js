import { useEffect, useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminShell, StatusBadge } from "../../../lib/AdminScreen";
import { colors as themeColors, fonts, radius } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { api } from "../../../lib/api";
import { fmtDate, fmtCurrency } from "../../../lib/utils";

const STATUSES = ["pending", "confirmed", "cancelled"];

export default function AdminBookingDetail() {
  const { id }   = useLocalSearchParams();
  const router   = useRouter();
  const colors   = useColors();
  const s        = useMemo(() => makeStyles(colors), [colors]);
  const [booking,  setBooking]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({ name: "", phone: "", email: "", numberOfSeats: "", totalAmount: "", status: "pending" });

  useEffect(() => { loadBooking(); }, [id]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/${id}`);
      const b   = res?.data || res;
      setBooking(b);
      setForm({
        name:          b.name || "",
        phone:         b.phone || "",
        email:         b.email || "",
        numberOfSeats: String(b.numberOfSeats || 1),
        totalAmount:   String(b.totalAmount || 0),
        status:        b.status || "pending",
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load booking");
      router.back();
    } finally { setLoading(false); }
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveEdits = async () => {
    setSaving(true);
    try {
      const payload = {
        name:          form.name,
        phone:         form.phone,
        email:         form.email || undefined,
        numberOfSeats: Number(form.numberOfSeats) || 1,
        totalAmount:   Number(form.totalAmount) || 0,
        status:        form.status,
      };
      const updated = await api.put(`/bookings/${id}`, payload);
      setBooking(prev => ({ ...prev, ...(updated?.data || updated) }));
      setEditMode(false);
      Alert.alert("Saved", "Booking updated successfully.");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update booking.");
    } finally { setSaving(false); }
  };

  const quickStatus = (status) => {
    Alert.alert(
      `Set to ${status}?`,
      `Change booking status to "${status}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSaving(true);
            try {
              await api.put(`/bookings/${id}`, { status });
              setBooking(b => ({ ...b, status }));
              setForm(f => ({ ...f, status }));
            } catch (e) {
              Alert.alert("Error", e.message || "Failed.");
            } finally { setSaving(false); }
          },
        },
      ]
    );
  };

  const markCash = () => {
    Alert.alert("Mark as Cash Payment?", "This will mark the booking as paid via cash.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid",
        onPress: async () => {
          setSaving(true);
          try {
            await api.put(`/bookings/${id}/mark-cash-payment`);
            setBooking(b => ({ ...b, paymentStatus: "paid", status: "confirmed" }));
          } catch (e) {
            Alert.alert("Error", e.message || "Failed.");
          } finally { setSaving(false); }
        },
      },
    ]);
  };

  const cancelBooking = () => quickStatus("cancelled");
  const confirmBooking = () => quickStatus("confirmed");

  if (loading) {
    return (
      <AdminShell title="Booking Details" subtitle="Loading...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </AdminShell>
    );
  }

  const b = booking;
  const bookId  = String(b._id || "").slice(-8).toUpperCase();
  const isCancelled = (b.status || "").toLowerCase() === "cancelled";
  const isConfirmed = ["confirmed", "paid"].includes((b.status || "").toLowerCase());

  // User who booked (populated from backend)
  const bookedUser = typeof b.userId === "object" ? b.userId : null;

  return (
    <AdminShell title="Booking Details" subtitle={`#${bookId}`}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Status + Quick Actions */}
        <View style={s.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={s.statusCardId}>#{bookId}</Text>
              <Text style={s.statusCardDate}>Booked on {fmtDate(b.createdAt)}</Text>
            </View>
            <StatusBadge status={b.status} />
          </View>

          {/* Payment row */}
          <View style={s.payRow}>
            <View style={s.payChip}>
              <Ionicons name={b.paymentStatus === "paid" ? "checkmark-circle" : "time"} size={13}
                color={b.paymentStatus === "paid" ? "#16A34A" : "#D97706"} />
              <Text style={[s.payChipTxt, { color: b.paymentStatus === "paid" ? "#16A34A" : "#D97706" }]}>
                Payment: {b.paymentStatus || "pending"}
              </Text>
            </View>
            {b.paymentId && (
              <Text style={s.payId} numberOfLines={1}>ID: {b.paymentId}</Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={s.actionRow}>
            {!isConfirmed && !isCancelled && (
              <TouchableOpacity style={s.confirmBtn} onPress={confirmBooking} disabled={saving}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={s.confirmBtnTxt}>Confirm</Text>
              </TouchableOpacity>
            )}
            {b.paymentStatus !== "paid" && !isCancelled && (
              <TouchableOpacity style={s.cashBtn} onPress={markCash} disabled={saving}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} />
                <Text style={s.cashBtnTxt}>Mark Cash</Text>
              </TouchableOpacity>
            )}
            {!isCancelled && (
              <TouchableOpacity style={s.cancelBtn} onPress={cancelBooking} disabled={saving}>
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(v => !v)}>
              <Ionicons name={editMode ? "close" : "create-outline"} size={16} color={colors.textPrimary} />
              <Text style={s.editBtnTxt}>{editMode ? "Discard" : "Edit"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Who booked */}
        <SectionHead label="· Passenger Info ·" s={s} />
        <View style={s.card}>
          {editMode ? (
            <>
              <Field label="Name" icon="person-outline" value={form.name}     onChangeText={v => setF("name", v)} s={s} colors={colors} />
              <Field label="Phone" icon="call-outline"  value={form.phone}    onChangeText={v => setF("phone", v)} kb="phone-pad" s={s} colors={colors} />
              <Field label="Email" icon="mail-outline"  value={form.email}    onChangeText={v => setF("email", v)} kb="email-address" s={s} colors={colors} />
            </>
          ) : (
            <>
              <InfoRow icon="person"    label="Name"   value={b.name} s={s} colors={colors} />
              <InfoRow icon="call"      label="Phone"  value={b.phone} s={s} colors={colors} />
              {b.email    ? <InfoRow icon="mail"       label="Email"  value={b.email} s={s} colors={colors} /> : null}
              {b.gender   ? <InfoRow icon="male-female" label="Gender" value={b.gender} s={s} colors={colors} /> : null}
              {b.age      ? <InfoRow icon="calendar"   label="Age"    value={String(b.age)} s={s} colors={colors} /> : null}
            </>
          )}
        </View>

        {/* Registered user details (if available from userId populate) */}
        {bookedUser && (
          <>
            <SectionHead label="· Account ·" s={s} />
            <View style={s.card}>
              <InfoRow icon="person-circle" label="Account"  value={bookedUser.name || "—"} s={s} colors={colors} />
              {bookedUser.email ? <InfoRow icon="mail"  label="Email"   value={bookedUser.email} s={s} colors={colors} /> : null}
              {bookedUser.phone ? <InfoRow icon="call"  label="Mobile"  value={bookedUser.phone} s={s} colors={colors} /> : null}
            </View>
          </>
        )}

        {/* Tour */}
        <SectionHead label="· Tour Details ·" s={s} />
        <View style={s.card}>
          <InfoRow icon="map"         label="Tour"        value={b.tourTitle || b.tour?.title || "—"} s={s} colors={colors} />
          <InfoRow icon="location"    label="Route"       value={`${b.source || "—"} → ${b.destination || "—"}`} s={s} colors={colors} />
          <InfoRow icon="calendar"    label="Trip Date"   value={fmtDate(b.tourStartDate || b.tripDate)} s={s} colors={colors} />
          {b.tourEndDate && <InfoRow icon="calendar-outline" label="End Date" value={fmtDate(b.tourEndDate)} s={s} colors={colors} />}
        </View>

        {/* Seats & Amount */}
        <SectionHead label="· Booking Summary ·" s={s} />
        <View style={s.card}>
          {editMode ? (
            <>
              <Field label="No. of Seats" icon="people-outline" value={form.numberOfSeats} onChangeText={v => setF("numberOfSeats", v)} kb="number-pad" s={s} colors={colors} />
              <Field label="Total Amount (₹)" icon="pricetag-outline" value={form.totalAmount} onChangeText={v => setF("totalAmount", v)} kb="number-pad" s={s} colors={colors} />
            </>
          ) : (
            <>
              <InfoRow icon="people"     label="Seats"     value={`${b.numberOfSeats || 1} seat(s)${b.seats?.length ? ` · Nos: ${(b.seats || []).join(", ")}` : ""}`} s={s} colors={colors} />
              <InfoRow icon="pricetag"   label="Amount"    value={fmtCurrency(b.totalAmount)} s={s} colors={colors} />
              {b.amountPaid ? <InfoRow icon="card" label="Paid" value={fmtCurrency(b.amountPaid)} s={s} colors={colors} /> : null}
            </>
          )}
        </View>

        {/* Additional passengers */}
        {Array.isArray(b.passengers) && b.passengers.length > 0 && (
          <>
            <SectionHead label="· Additional Passengers ·" s={s} />
            <View style={s.card}>
              {b.passengers.map((p, i) => (
                <View key={i} style={[s.passengerItem, i < b.passengers.length - 1 && s.passengerBorder]}>
                  <View style={s.passengerNum}>
                    <Text style={s.passengerNumTxt}>{i + 2}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.passengerName}>{p.name}</Text>
                    {p.mobileNo ? <Text style={s.passengerMeta}>{p.mobileNo}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Status selector in edit mode */}
        {editMode && (
          <>
            <SectionHead label="· Status ·" s={s} />
            <View style={s.statusRow}>
              {STATUSES.map(st => (
                <TouchableOpacity key={st}
                  style={[s.statusChip, form.status === st && s.statusChipActive]}
                  onPress={() => setF("status", st)}>
                  <Text style={[s.statusChipTxt, form.status === st && { color: colors.primary }]}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Save button in edit mode */}
        {editMode && (
          <TouchableOpacity style={s.saveCta} onPress={saveEdits} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.saveCtaTxt}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      </ScrollView>
    </AdminShell>
  );
}

function SectionHead({ label, s }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function InfoRow({ icon, label, value, s, colors }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}><Ionicons name={icon} size={15} color={colors.primary} /></View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}

function Field({ label, icon, value, onChangeText, kb = "default", s, colors }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={kb}
          placeholder={label}
          placeholderTextColor={colors.textDisabled}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  statusCard:    { backgroundColor: colors.surface, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.borderSubtle },
  statusCardId:  { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  statusCardDate:{ fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  payRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  payChip:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.borderSubtle, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  payChipTxt:{ fontFamily: fonts.bodyMedium, fontSize: 11 },
  payId:     { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.5, flex: 1 },

  actionRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  confirmBtn:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#16A34A", borderRadius: 999 },
  confirmBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  cashBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.primary + "18", borderRadius: 999 },
  cashBtnTxt:  { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  cancelBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#DC262618", borderRadius: 999 },
  cancelBtnTxt:{ fontFamily: fonts.bodyBold, fontSize: 12, color: "#DC2626" },
  editBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.borderSubtle, borderRadius: 999 },
  editBtnTxt:  { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textPrimary },

  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 12, marginTop: 4 },
  card:         { backgroundColor: colors.surface, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.borderSubtle },

  infoRow:   { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, gap: 12 },
  infoIcon:  { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center" },
  infoLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary, width: 80, paddingTop: 6 },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, flex: 1, paddingTop: 6 },

  field:      { marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  inputWrap:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle },
  input:      { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, height: 50 },

  passengerItem:   { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  passengerBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  passengerNum:    { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + "30", alignItems: "center", justifyContent: "center" },
  passengerNumTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  passengerName:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  passengerMeta:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  statusRow:      { flexDirection: "row", gap: 8, marginBottom: 20 },
  statusChip:     { flex: 1, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  statusChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  statusChipTxt:  { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },

  saveCta:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 999, backgroundColor: colors.primary, marginTop: 4 },
  saveCtaTxt:  { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
});
