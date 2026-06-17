import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { api, volunteerApi } from "../../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts, radius } from "../../lib/theme";

const DOCS = [
  {
    key: "aadhaar",
    label: "Aadhaar Card",
    desc: "Upload front side of your Aadhaar card",
    icon: "card-outline",
    required: true,
  },
  {
    key: "driving_license",
    label: "Driving License",
    desc: "Upload your valid driving license",
    icon: "car-outline",
    required: true,
  },
];

export default function VolunteerOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { toast, showToast, hideToast } = useToast();
  const [uploads, setUploads] = useState({}); // key -> { uri, url, uploading }
  const [submitting, setSubmitting] = useState(false);

  const pickAndUpload = async (docKey) => {
    try {
      let result;

      if (Platform.OS === "web") {
        result = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        setUploads((p) => ({
          ...p,
          [docKey]: { uri: asset.uri, uploading: true },
        }));

        const formData = new FormData();
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("file", blob, asset.name);
        const up = await api.post("/upload", formData);
        setUploads((p) => ({
          ...p,
          [docKey]: { uri: asset.uri, url: up.url, uploading: false },
        }));
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        setUploads((p) => ({
          ...p,
          [docKey]: { uri: asset.uri, uploading: true },
        }));

        const filename = asset.uri.split("/").pop();
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        const formData = new FormData();
        formData.append("file", { uri: asset.uri, name: filename, type: mime });
        const up = await api.post("/upload", formData);
        setUploads((p) => ({
          ...p,
          [docKey]: { uri: asset.uri, url: up.url, uploading: false },
        }));
      }
    } catch (e) {
      setUploads((p) => ({
        ...p,
        [docKey]: { ...p[docKey], uploading: false },
      }));
      showToast(e.message || "Could not upload document", "error");
    }
  };

  const handleSubmit = async () => {
    const missing = DOCS.filter((d) => d.required && !uploads[d.key]?.url);
    if (missing.length > 0) {
      showToast(`Please upload: ${missing.map((d) => d.label).join(", ")}`, "error");
      return;
    }

    setSubmitting(true);
    try {
      for (const doc of DOCS) {
        if (uploads[doc.key]?.url) {
          await volunteerApi.uploadDoc({
            docType: doc.key,
            url: uploads[doc.key].url,
          });
        }
      }
      // Mark first login as done in local storage
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({ ...user, isFirstLogin: false }),
          );
        } catch {}
      }
      // Navigate first — Alert callbacks are unreliable on web
      router.replace("/volunteer");
      showToast("Your documents have been submitted for verification. You will be notified once reviewed.", "success");
    } catch (e) {
      showToast(e.message || "Failed to submit documents", "error");
    }
    setSubmitting(false);
  };

  const handleSkip = async () => {
    // Update local storage so we don't re-show onboarding on next login
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({ ...user, isFirstLogin: false }),
        );
      }
    } catch {}
    router.replace("/volunteer");
  };

  const allRequired = DOCS.filter((d) => d.required).every(
    (d) => !!uploads[d.key]?.url,
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="shield-checkmark" size={28} color="white" />
        </View>
        <Text style={s.headerTitle}>Identity Verification</Text>
        <Text style={s.headerSub}>
          Upload your documents to get verified as a volunteer
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#1E40AF" />
          <Text style={s.infoBannerTxt}>
            Your documents are securely stored and only visible to your operator
            admin. Verification is required to access volunteer features.
          </Text>
        </View>

        {/* Document upload cards */}
        {DOCS.map((doc) => {
          const upload = uploads[doc.key];
          const uploaded = !!upload?.url;
          const uploading = !!upload?.uploading;

          return (
            <View key={doc.key} style={[s.docCard, uploaded && s.docCardDone]}>
              <View style={s.docCardTop}>
                <View
                  style={[
                    s.docIcon,
                    { backgroundColor: uploaded ? "#DCFCE7" : "#FEE8E2" },
                  ]}
                >
                  <Ionicons
                    name={uploaded ? "checkmark-circle" : doc.icon}
                    size={22}
                    color={uploaded ? "#16A34A" : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.docLabelRow}>
                    <Text style={s.docLabel}>{doc.label}</Text>
                    {doc.required && (
                      <View style={s.requiredBadge}>
                        <Text style={s.requiredTxt}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.docDesc}>{doc.desc}</Text>
                </View>
              </View>

              {uploaded ? (
                <View style={s.uploadedRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={s.uploadedTxt}>
                    Document uploaded successfully
                  </Text>
                  <TouchableOpacity
                    onPress={() => pickAndUpload(doc.key)}
                    style={s.reuploadBtn}
                  >
                    <Text style={s.reuploadTxt}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.uploadBtn, uploading && { opacity: 0.6 }]}
                  onPress={() => pickAndUpload(doc.key)}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={s.uploadBtnTxt}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={s.uploadBtnTxt}>Upload {doc.label}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Verification note */}
        <View style={s.verifyNote}>
          <Ionicons name="time-outline" size={16} color="#D97706" />
          <Text style={s.verifyNoteTxt}>
            Admin will review and verify your documents. You will receive a
            notification once verified.
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[
            s.submitBtn,
            (!allRequired || submitting) && { opacity: 0.5 },
          ]}
          onPress={handleSubmit}
          disabled={!allRequired || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={s.submitBtnTxt}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipBtnTxt}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 20,
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Philosopher_700Bold",
    fontSize: 24,
    color: "white",
    textAlign: "center",
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },

  infoBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "flex-start",
  },
  infoBannerTxt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },

  docCard: {
    backgroundColor: "white",
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  docCardDone: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  docCardTop: { flexDirection: "row", alignItems: "flex-start" },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  docLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  docLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1F2937" },
  requiredBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requiredTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#DC2626" },
  docDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: 12,
    backgroundColor: "#FEF8F6",
  },
  uploadBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },

  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadedTxt: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#16A34A",
  },
  reuploadBtn: { paddingHorizontal: 8 },
  reuploadTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },

  verifyNote: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "flex-start",
  },
  verifyNoteTxt: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },

  skipBtn: { alignItems: "center", paddingVertical: 12 },
  skipBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
