import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../lib/api";
import { fonts, radius, shadow } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const DOC_TYPES = [
  { key: "aadhaar", label: "Aadhaar Card", icon: "card" },
  { key: "passport", label: "Passport", icon: "airplane" },
  { key: "visa", label: "Visa", icon: "earth" },
  { key: "driving_license", label: "Driving License", icon: "car" },
  { key: "pan", label: "PAN Card", icon: "document-text" },
  { key: "other", label: "Other", icon: "document" },
];

export default function AddDocumentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { toast, showToast, hideToast } = useToast();
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Permission needed to access media library", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setFileUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!type) { showToast("Please select document type", "error"); return; }
    if (!title.trim()) { showToast("Please enter document title", "error"); return; }
    if (!fileUri) { showToast("Please add document image", "error"); return; }
    setSubmitting(true);
    try {
      await api.post("/documents", {
        type,
        title: title.trim(),
        documentNumber: docNumber.trim() || undefined,
        fileUrl: fileUri,
      });
      router.back();
    } catch {
      showToast("Failed to save document", "error");
    }
    setSubmitting(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Document</Text>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!type || !title || !fileUri) && styles.saveBtnDisabled,
          ]}
          onPress={submit}
          disabled={!type || !title || !fileUri || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View>
          <Text style={styles.label}>Document Type *</Text>
          <View style={styles.typesGrid}>
            {DOC_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeCard,
                  type === t.key && styles.typeCardActive,
                  shadow.soft,
                ]}
                onPress={() => setType(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={24}
                  color={type === t.key ? "white" : colors.primary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    type === t.key && styles.typeLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. My Aadhaar Card"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View>
          <Text style={styles.label}>Document Number</Text>
          <TextInput
            style={styles.input}
            value={docNumber}
            onChangeText={setDocNumber}
            placeholder="Optional"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View>
          <Text style={styles.label}>Document Image *</Text>
          <TouchableOpacity
            style={[
              styles.uploadBtn,
              shadow.soft,
              fileUri && styles.uploadBtnSuccess,
            ]}
            onPress={pickImage}
          >
            <Ionicons
              name={fileUri ? "checkmark-circle" : "cloud-upload-outline"}
              size={28}
              color={fileUri ? "#16A34A" : colors.primary}
            />
            <Text style={[styles.uploadText, fileUri && { color: "#16A34A" }]}>
              {fileUri ? "Image selected" : "Tap to upload"}
            </Text>
            <Text style={styles.uploadSub}>JPG, PNG supported</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  cancelBtn: {},
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  saveBtnDisabled: { backgroundColor: colors.borderSubtle },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    width: "30%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  typeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: "center",
  },
  typeLabelActive: { color: "white" },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  uploadBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
  },
  uploadBtnSuccess: { borderColor: "#16A34A", borderStyle: "solid" },
  uploadText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary,
  },
  uploadSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
