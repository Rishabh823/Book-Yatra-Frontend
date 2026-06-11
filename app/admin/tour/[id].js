import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts, radius, shadow } from "../../../lib/theme";
import { tours as toursApi, upload as uploadApi } from "../../../lib/api";
import { DateInput } from "../../../components/DateInput";

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

export default function TourDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    toursApi
      .byId(id)
      .then((data) => {
        setTour(data);
        setForm({
          title: data.title || "",
          description: data.description || "",
          source: data.source || "",
          destination: data.destination || "",
          startDate: data.startDate ? data.startDate.split("T")[0] : "",
          endDate: data.endDate ? data.endDate.split("T")[0] : "",
          price: data.price || "",
          coverPhotoUrl: data.coverPhotoUrl || "",
          totalSeats: String(data.totalSeats || data.seats || 40),
          busType: data.busType || "AC Bus",
          seatStructure: data.seatStructure || "2x2",
          tourType: data.tourType || "other",
        });
      })
      .catch(() => Alert.alert("Error", "Could not load tour."))
      .finally(() => setLoading(false));
  }, [id]);

  const f = (v, k) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo access to upload a cover image.",
        );
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
      else Alert.alert("Upload Failed", "Could not get image URL.");
    } catch (e) {
      Alert.alert("Upload Failed", e.message || "Try again.");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!form.title?.trim()) {
      Alert.alert("Validation", "Title is required.");
      return;
    }
    if (!form.coverPhotoUrl) {
      Alert.alert("Validation", "Cover photo is required.");
      return;
    }
    setSaving(true);
    try {
      await toursApi.update(id, {
        ...form,
        totalSeats: parseInt(form.totalSeats) || 40,
        seats: parseInt(form.totalSeats) || 40,
      });
      setDirty(false);
      Alert.alert("Saved", "Tour updated successfully.");
    } catch (e) {
      Alert.alert("Error", e.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      "Delete Tour",
      `Are you sure you want to delete "${form?.title || "this tour"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await toursApi.remove(id);
              router.back();
            } catch (e) {
              Alert.alert("Error", e.message || "Delete failed.");
            }
          },
        },
      ],
    );
  };

  const px = width >= 600 ? 24 : 16;
  const maxW = Math.min(width, 640);

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

  if (!form) {
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
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text
          style={{
            fontFamily: fonts.body,
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >
          Tour not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const typeColor = TYPE_COLORS[form.tourType] || "#6B7280";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[s.header, { paddingHorizontal: px }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {form.title || "Tour Details"}
          </Text>
          <Text style={s.headerSub}>Tap any field to edit</Text>
        </View>
        {dirty && (
          <TouchableOpacity
            style={s.saveTopBtn}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveTopBtnTxt}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: px,
            paddingBottom: 40,
            alignSelf: "center",
            width: "100%",
            maxWidth: maxW,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover photo */}
          <TouchableOpacity
            style={s.coverWrap}
            onPress={pickPhoto}
            disabled={uploading}
            activeOpacity={0.9}
          >
            {form.coverPhotoUrl ? (
              <Image source={{ uri: form.coverPhotoUrl }} style={s.cover} />
            ) : (
              <View style={s.coverEmpty}>
                <Ionicons
                  name="image-outline"
                  size={40}
                  color={colors.textDisabled}
                />
                <Text style={s.coverEmptyTxt}>No cover photo</Text>
              </View>
            )}
            <View style={s.coverEditBadge}>
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
              <Text style={s.coverEditTxt}>
                {uploading ? "Uploading…" : "Change Photo"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Tour type + bus type badges */}
          <View style={s.badgeRow}>
            <View
              style={[
                s.typePill,
                {
                  backgroundColor: typeColor + "18",
                  borderColor: typeColor + "40",
                },
              ]}
            >
              <Text style={[s.typePillTxt, { color: typeColor }]}>
                {form.tourType}
              </Text>
            </View>
            <View style={s.busPill}>
              <Ionicons
                name="bus-outline"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={s.busPillTxt}>{form.busType}</Text>
            </View>
          </View>

          {/* Section: Basic Info */}
          <SectionLabel label="Basic Info" />
          <EditField
            label="Tour Title"
            value={form.title}
            onChangeText={(v) => f(v, "title")}
            placeholder="e.g. Char Dham Yatra"
          />
          <EditField
            label="Description"
            value={form.description}
            onChangeText={(v) => f(v, "description")}
            placeholder="Tour description"
            multiline
            numberOfLines={4}
            style={{ height: 90, textAlignVertical: "top" }}
          />

          {/* Section: Route & Dates */}
          <SectionLabel label="Route & Dates" />
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <EditField
                label="From"
                value={form.source}
                onChangeText={(v) => f(v, "source")}
                placeholder="Delhi"
              />
            </View>
            <View style={{ flex: 1 }}>
              <EditField
                label="To"
                value={form.destination}
                onChangeText={(v) => f(v, "destination")}
                placeholder="Haridwar"
              />
            </View>
          </View>
          <View style={s.row2}>
            <DateInput
              label="Start Date"
              value={form.startDate}
              onChange={(v) => f(v, "startDate")}
              style={{ flex: 1 }}
            />
            <DateInput
              label="End Date"
              value={form.endDate}
              onChange={(v) => f(v, "endDate")}
              style={{ flex: 1 }}
            />
          </View>

          {/* Section: Pricing & Seats */}
          <SectionLabel label="Pricing & Seats" />
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <EditField
                label="Price (₹)"
                value={form.price}
                onChangeText={(v) => f(v, "price")}
                placeholder="5000"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <EditField
                label="Seats"
                value={form.totalSeats}
                onChangeText={(v) => f(v, "totalSeats")}
                placeholder="40"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Section: Tour Config */}
          <SectionLabel label="Configuration" />
          <ChipSelector
            label="Tour Type"
            options={TOUR_TYPES}
            value={form.tourType}
            onSelect={(v) => f(v, "tourType")}
            optColors={TYPE_COLORS}
          />
          <ChipSelector
            label="Bus Type"
            options={BUS_TYPES}
            value={form.busType}
            onSelect={(v) => f(v, "busType")}
          />
          <ChipSelector
            label="Seat Layout"
            options={SEAT_STRUCTURES}
            value={form.seatStructure}
            onSelect={(v) => f(v, "seatStructure")}
          />

          {/* Save changes button */}
          {dirty && (
            <TouchableOpacity
              style={s.saveBtn}
              onPress={onSave}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.saveBtnTxt}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Delete section */}
          <View style={s.dangerZone}>
            <View style={s.dangerTop}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={s.dangerLabel}>Danger Zone</Text>
            </View>
            <Text style={s.dangerSub}>
              Deleting this tour is permanent and cannot be undone. All
              associated bookings may be affected.
            </Text>
            <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={s.deleteBtnTxt}>Delete This Tour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function EditField({ label, style, ...props }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, style]}
        placeholderTextColor={colors.textDisabled}
        {...props}
      />
    </View>
  );
}

function ChipSelector({ label, options, value, onSelect, optColors }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.chipRow}>
        {options.map((opt) => {
          const active = value === opt;
          const col = optColors?.[opt] || colors.primary;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                s.chip,
                active && { backgroundColor: col + "20", borderColor: col },
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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.secondary,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 1,
  },
  saveTopBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  saveTopBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 13 },

  coverWrap: {
    borderRadius: radius.xl,
    overflow: "hidden",
    height: 200,
    backgroundColor: colors.borderSubtle,
    marginBottom: 12,
  },
  cover: { width: "100%", height: "100%", resizeMode: "cover" },
  coverEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  coverEmptyTxt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDisabled,
  },
  coverEditBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  coverEditTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 12 },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  typePillTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "capitalize",
  },
  busPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  busPillTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },

  row2: { flexDirection: "row", gap: 12, marginBottom: 0 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    fontFamily: fonts.accent,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    ...shadow.soft,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 52,
    marginTop: 12,
    marginBottom: 8,
    ...shadow.card,
  },
  saveBtnTxt: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 15 },

  dangerZone: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "#FFF5F5",
  },
  dangerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dangerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.error,
  },
  dangerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radius.pill,
    height: 46,
    backgroundColor: "#fff",
  },
  deleteBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.error,
  },
});
