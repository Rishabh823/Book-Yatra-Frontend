import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminShell } from "../../lib/AdminScreen";
import { colors, fonts, radius } from "../../lib/theme";
import { tours as toursApi, upload as uploadApi } from "../../lib/api";
import { DateInput } from "../../components/DateInput";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const BUS_TYPES = ["AC Bus", "Non AC Bus"];
const SEAT_STRUCTURES = ["2x2", "2x3"];
const TOUR_TYPES = [
  "temple",
  "pilgrimage",
  "mountain",
  "leisure",
  "heritage",
  "beach",
  "other",
];
const TYPE_COLORS = {
  temple: "#D97706",
  pilgrimage: colors.primary,
  mountain: "#0284C7",
  leisure: "#16A34A",
  heritage: "#7C3AED",
  beach: "#0891B2",
  other: "#6B7280",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  source: "",
  destination: "",
  startDate: "",
  endDate: "",
  price: "",
  coverPhotoUrl: "",
  totalSeats: "40",
  busType: "AC Bus",
  seatStructure: "2x2",
  tourType: "other",
};

export default function AdminTours() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const px = width >= 600 ? 20 : 14;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast, showToast, hideToast } = useToast();

  const load = async () => {
    try {
      const res = await toursApi.all();
      setItems(Array.isArray(res) ? res : res?.data || res?.tours || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = search
    ? items.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.destination || "").toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const openCreate = () => {
    router.push("/admin/tour/create");
  };

  const f = (v, k) => setForm((prev) => ({ ...prev, [k]: v }));

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast("Allow photo access to upload a cover image.", "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploading(true);
      const res = await uploadApi.image(result.assets[0].uri);
      if (res?.url) f(res.url, "coverPhotoUrl");
      else showToast("Could not get image URL.", "error");
    } catch (e) {
      showToast(e.message || "Try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    for (const k of [
      "title",
      "description",
      "source",
      "destination",
      "startDate",
      "endDate",
      "price",
    ]) {
      if (!form[k]?.trim()) {
        showToast(`"${k}" is required.`, "error");
        return false;
      }
    }
    if (!form.coverPhotoUrl) {
      showToast("Please upload a cover photo.", "error");
      return false;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      showToast("End date must be after start date.", "error");
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanDate = (v) =>
        v ? v.replace(/[^0-9-]/g, "").replace(/-{2,}/g, "-") : v;
      await toursApi.create({
        ...form,
        startDate: cleanDate(form.startDate),
        endDate: cleanDate(form.endDate),
        totalSeats: parseInt(form.totalSeats) || 40,
        seats: parseInt(form.totalSeats) || 40,
      });
      setModal(false);
      load();
    } catch (e) {
      showToast(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = useCallback(
    ({ item }) => {
      const color = TYPE_COLORS[item.tourType] || "#6B7280";
      const startStr = item.startDate
        ? new Date(item.startDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      const endStr = item.endDate
        ? new Date(item.endDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      return (
        <TouchableOpacity
          style={[s.card, { marginHorizontal: px }]}
          onPress={() => router.push(`/admin/tour/${item._id}`)}
          activeOpacity={0.82}
        >
          {item.coverPhotoUrl ? (
            <Image source={{ uri: item.coverPhotoUrl }} style={s.thumb} />
          ) : (
            <View style={[s.thumbFallback, { backgroundColor: color + "18" }]}>
              <Ionicons name="bus-outline" size={22} color={color} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={s.metaRow}>
              <Ionicons
                name="location-outline"
                size={11}
                color={colors.textSecondary}
              />
              <Text style={s.meta} numberOfLines={1}>
                {item.source} → {item.destination}
              </Text>
            </View>
            <View style={s.metaRow}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={colors.textSecondary}
              />
              <Text style={s.meta}>
                {startStr} – {endStr}
              </Text>
            </View>
            <View style={s.cardFoot}>
              <View style={[s.typeBadge, { backgroundColor: color + "15" }]}>
                <Text style={[s.typeText, { color }]}>
                  {item.tourType || "other"}
                </Text>
              </View>
              <Text style={s.price}>₹{item.price || "—"}</Text>
              <Text style={s.seats}>
                {item.totalSeats || item.seats || "—"} seats
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textDisabled}
            style={{ alignSelf: "center" }}
          />
        </TouchableOpacity>
      );
    },
    [px],
  );

  return (
    <AdminShell title="Manage Tours" subtitle={`${filtered.length} tours`}>
      {/* Search + New Tour */}
      <View style={[s.topBar, { paddingHorizontal: px }]}>
        <View style={s.searchWrap}>
          <Ionicons
            name="search-outline"
            size={15}
            color={colors.textSecondary}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search tours..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={15}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={s.draftsBtn}
          onPress={() => router.push("/admin/drafts")}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.newBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnTxt}>New Tour</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it._id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 8 }}>
              <Ionicons
                name="bus-outline"
                size={52}
                color={colors.textDisabled}
              />
              <Text
                style={{ fontFamily: fonts.body, color: colors.textSecondary }}
              >
                No tours yet. Tap "New Tour" to create one.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={modal}
        animationType="fade"
        transparent
        onRequestClose={() => !saving && setModal(false)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              s.sheet,
              { width: Math.min(width - 28, 560), maxHeight: height * 0.88 },
            ]}
          >
            <Text style={s.sheetTitle}>Create New Tour</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Cover photo upload */}
              <View style={s.field}>
                <Text style={s.label}>Cover Photo *</Text>
                <TouchableOpacity
                  style={s.photoPicker}
                  onPress={pickPhoto}
                  disabled={uploading}
                >
                  {form.coverPhotoUrl ? (
                    <Image
                      source={{ uri: form.coverPhotoUrl }}
                      style={s.photoPreview}
                    />
                  ) : (
                    <View style={s.photoEmpty}>
                      <Ionicons
                        name="camera-outline"
                        size={28}
                        color={colors.textSecondary}
                      />
                      <Text style={s.photoEmptyTxt}>Tap to upload photo</Text>
                    </View>
                  )}
                  {uploading && (
                    <View style={s.photoOverlay}>
                      <ActivityIndicator color="#fff" size="large" />
                      <Text style={s.photoOverlayTxt}>Uploading…</Text>
                    </View>
                  )}
                  {form.coverPhotoUrl ? (
                    <View style={s.photoChangeBadge}>
                      <Ionicons name="camera" size={13} color="#fff" />
                      <Text style={s.photoChangeTxt}>Change</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>

              <Field
                label="Tour Title *"
                value={form.title}
                onChangeText={(v) => f(v, "title")}
                placeholder="e.g. Char Dham Yatra 2025"
              />
              <Field
                label="Description *"
                value={form.description}
                onChangeText={(v) => f(v, "description")}
                placeholder="Brief description"
                multiline
                numberOfLines={3}
                style={{ height: 76, textAlignVertical: "top" }}
              />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="From *"
                    value={form.source}
                    onChangeText={(v) => f(v, "source")}
                    placeholder="Delhi"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="To *"
                    value={form.destination}
                    onChangeText={(v) => f(v, "destination")}
                    placeholder="Haridwar"
                  />
                </View>
              </View>
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <DateInput
                    label="Start Date *"
                    value={form.startDate}
                    onChange={(v) => f(v, "startDate")}
                    style={{ flex: 1, marginBottom: 11 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateInput
                    label="End Date *"
                    value={form.endDate}
                    onChange={(v) => f(v, "endDate")}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Price (₹) *"
                    value={form.price}
                    onChangeText={(v) => f(v, "price")}
                    placeholder="5000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Seats"
                    value={form.totalSeats}
                    onChangeText={(v) => f(v, "totalSeats")}
                    placeholder="40"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <SelectorRow
                label="Tour Type"
                options={TOUR_TYPES}
                value={form.tourType}
                onSelect={(v) => f(v, "tourType")}
                optColors={TYPE_COLORS}
              />
              <SelectorRow
                label="Bus Type"
                options={BUS_TYPES}
                value={form.busType}
                onSelect={(v) => f(v, "busType")}
              />
              <SelectorRow
                label="Seat Layout"
                options={SEAT_STRUCTURES}
                value={form.seatStructure}
                onSelect={(v) => f(v, "seatStructure")}
              />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModal(false)}
                disabled={saving}
              >
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={onSave}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnTxt}>Create Tour</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </AdminShell>
  );
}

function Field({ label, style, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, style]}
        placeholderTextColor={colors.textDisabled}
        {...props}
      />
    </View>
  );
}

function SelectorRow({ label, options, value, onSelect, optColors }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = value === opt;
          const col = optColors?.[opt] || colors.primary;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                s.chip,
                active && { backgroundColor: col + "22", borderColor: col },
              ]}
              onPress={() => onSelect(opt)}
            >
              <Text
                style={[
                  s.chipTxt,
                  active && { color: col, fontFamily: fonts.bodyBold },
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
    marginTop: 4,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 999,
  },
  newBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 13 },
  draftsBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    resizeMode: "cover",
    backgroundColor: colors.borderSubtle,
  },
  thumbFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    textTransform: "capitalize",
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  seats: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 14,
  },

  // Photo picker
  photoPicker: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
    height: 140,
  },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoEmptyTxt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoOverlayTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 13 },
  photoChangeBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  photoChangeTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 11 },

  field: { marginBottom: 11 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  row2: { flexDirection: "row", gap: 10 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: 8,
    alignSelf: "flex-start",
  },
  chipTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },

  footer: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
  },
  cancelBtnTxt: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  saveBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 15 },
});
