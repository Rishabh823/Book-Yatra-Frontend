import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { volunteerApi } from "../../../lib/api";
import { colors, fonts, radius, shadow } from "../../../lib/theme";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_COLOR = {
  active: { bg: "#DCFCE7", color: "#16A34A" },
  suspended: { bg: "#FEE2E2", color: "#DC2626" },
  pending: { bg: "#FEF3C7", color: "#D97706" },
};

const DOC_LABELS = {
  aadhaar: "Aadhaar Card",
  driving_license: "Driving License",
  passport: "Passport",
  other: "Other Document",
};

const DOC_STATUS_COLOR = {
  pending: { bg: "#FEF3C7", color: "#D97706", icon: "time-outline" },
  verified: { bg: "#DCFCE7", color: "#16A34A", icon: "checkmark-circle-outline" },
  rejected: { bg: "#FEE2E2", color: "#DC2626", icon: "close-circle-outline" },
};

export default function VolunteerDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [verifyModal, setVerifyModal] = useState(null); // { docIndex, docType }
  const [reviewNote, setReviewNote] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await volunteerApi.getById(id);
      setVolunteer(res?.data || res);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load volunteer");
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (status) => {
    setStatusLoading(true);
    try {
      await volunteerApi.updateStatus(id, status);
      setVolunteer((v) => ({ ...v, volunteerStatus: status }));
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update status");
    }
    setStatusLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Volunteer",
      `Remove ${volunteer?.name} as a volunteer? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await volunteerApi.delete(id);
              router.back();
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to delete volunteer");
            }
          },
        },
      ]
    );
  };

  const submitVerify = async (status) => {
    if (!verifyModal) return;
    setVerifying(true);
    try {
      const res = await volunteerApi.verifyDoc(id, {
        docIndex: verifyModal.docIndex,
        status,
        reviewNote: reviewNote.trim() || undefined,
      });
      setVolunteer((v) => ({ ...v, verificationDocs: res?.data || v.verificationDocs }));
      setVerifyModal(null);
      setReviewNote("");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update document");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!volunteer) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="person-outline" size={48} color={colors.textDisabled} />
        <Text style={s.emptyText}>Volunteer not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkTxt}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = volunteer.volunteerStatus || "active";
  const sc = STATUS_COLOR[status] || STATUS_COLOR.pending;
  const docs = volunteer.verificationDocs || [];
  const assignedTours = volunteer.assignedTours || [];
  const verifiedCount = docs.filter((d) => d.status === "verified").length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={["#1E0A0A", "#5C1615"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Volunteer Profile</Text>
        <TouchableOpacity onPress={handleDelete} style={s.deleteHeaderBtn}>
          <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
        {/* Profile card */}
        <View style={[s.card, shadow?.soft]}>
          <View style={s.profileTop}>
            <View style={[s.bigAvatar, { backgroundColor: status === "suspended" ? "#9CA3AF" : colors.primary }]}>
              <Text style={s.bigAvatarText}>{(volunteer.name || "V")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.volName}>{volunteer.name}</Text>
              <Text style={s.volEmail}>{volunteer.email}</Text>
              {volunteer.phone ? (
                <Text style={s.volPhone}>{volunteer.phone}</Text>
              ) : null}
              <View style={[s.statusBadge, { backgroundColor: sc.bg, marginTop: 6 }]}>
                <View style={[s.statusDot, { backgroundColor: sc.color }]} />
                <Text style={[s.statusBadgeTxt, { color: sc.color }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Member Since</Text>
              <Text style={s.infoValue}>{fmtDate(volunteer.createdAt)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Docs Verified</Text>
              <Text style={[s.infoValue, { color: verifiedCount === docs.length && docs.length > 0 ? "#16A34A" : "#D97706" }]}>
                {verifiedCount}/{docs.length}
              </Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Tours Assigned</Text>
              <Text style={s.infoValue}>{assignedTours.length}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>First Login</Text>
              <Text style={s.infoValue}>{volunteer.isFirstLogin ? "Pending" : "Done"}</Text>
            </View>
          </View>

          {/* Status actions */}
          <View style={s.statusActions}>
            {statusLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : status === "active" ? (
              <TouchableOpacity
                style={[s.actionPill, { backgroundColor: "#FEF3C7", borderColor: "#D97706" }]}
                onPress={() =>
                  Alert.alert("Suspend Volunteer", `Suspend ${volunteer.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Suspend", style: "destructive", onPress: () => updateStatus("suspended") },
                  ])
                }
              >
                <Ionicons name="pause-circle-outline" size={15} color="#D97706" />
                <Text style={[s.actionPillTxt, { color: "#D97706" }]}>Suspend</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.actionPill, { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }]}
                onPress={() => updateStatus("active")}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
                <Text style={[s.actionPillTxt, { color: "#16A34A" }]}>Activate</Text>
              </TouchableOpacity>
            )}
            {status !== "pending" && (
              <TouchableOpacity
                style={[s.actionPill, { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}
                onPress={() => updateStatus("pending")}
              >
                <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                <Text style={[s.actionPillTxt, { color: colors.textSecondary }]}>Set Pending</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Verification documents */}
        <View style={[s.card, shadow?.soft]}>
          <View style={s.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={s.sectionTitle}>Verification Documents</Text>
            <Text style={s.sectionCount}>{docs.length}</Text>
          </View>

          {docs.length === 0 ? (
            <View style={s.emptySection}>
              <Ionicons name="document-outline" size={32} color={colors.textDisabled} />
              <Text style={s.emptySectionTxt}>No documents uploaded yet</Text>
              <Text style={s.emptySectionSub}>Volunteer will be prompted to upload on first login</Text>
            </View>
          ) : (
            docs.map((doc, idx) => {
              const ds = DOC_STATUS_COLOR[doc.status] || DOC_STATUS_COLOR.pending;
              return (
                <View key={idx} style={s.docRow}>
                  <View style={[s.docIconBox, { backgroundColor: ds.bg }]}>
                    <Ionicons name={ds.icon} size={20} color={ds.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.docType}>{DOC_LABELS[doc.docType] || doc.docType}</Text>
                    <Text style={s.docDate}>Uploaded {fmtDate(doc.uploadedAt)}</Text>
                    {doc.reviewNote ? (
                      <Text style={s.docNote}>Note: {doc.reviewNote}</Text>
                    ) : null}
                    <View style={[s.docStatusBadge, { backgroundColor: ds.bg }]}>
                      <Text style={[s.docStatusTxt, { color: ds.color }]}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.docActions}>
                    {doc.url ? (
                      <TouchableOpacity
                        style={s.docActionBtn}
                        onPress={() => {
                          // Open doc URL
                          import("expo-web-browser").then(({ openBrowserAsync }) =>
                            openBrowserAsync(doc.url)
                          );
                        }}
                      >
                        <Ionicons name="eye-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={s.docActionBtn}
                      onPress={() => {
                        setVerifyModal({ docIndex: idx, docType: doc.docType });
                        setReviewNote(doc.reviewNote || "");
                      }}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#16A34A" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Assigned tours */}
        <View style={[s.card, shadow?.soft]}>
          <View style={s.sectionHeader}>
            <Ionicons name="bus-outline" size={18} color={colors.primary} />
            <Text style={s.sectionTitle}>Assigned Tours</Text>
            <Text style={s.sectionCount}>{assignedTours.length}</Text>
          </View>

          {assignedTours.length === 0 ? (
            <View style={s.emptySection}>
              <Ionicons name="bus-outline" size={32} color={colors.textDisabled} />
              <Text style={s.emptySectionTxt}>No tours assigned yet</Text>
            </View>
          ) : (
            assignedTours.map((tour) => (
              <View key={tour._id} style={s.tourRow}>
                <View style={s.tourDot} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.tourTitle}>{tour.title}</Text>
                  <Text style={s.tourMeta}>
                    {tour.source} → {tour.destination}
                  </Text>
                  <Text style={s.tourDate}>{fmtDate(tour.startDate)}</Text>
                </View>
                <View style={[s.tourStatusBadge, {
                  backgroundColor: tour.status === "active" ? "#DCFCE7" : "#F3F4F6",
                }]}>
                  <Text style={[s.tourStatusTxt, {
                    color: tour.status === "active" ? "#16A34A" : colors.textSecondary,
                  }]}>
                    {(tour.status || "draft").charAt(0).toUpperCase() + (tour.status || "draft").slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Danger zone */}
        <View style={[s.card, s.dangerCard]}>
          <Text style={s.dangerTitle}>Danger Zone</Text>
          <Text style={s.dangerSub}>
            Deleting a volunteer is permanent. They will be removed from all assigned tours.
          </Text>
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="white" />
            <Text style={s.deleteBtnTxt}>Delete Volunteer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Verify doc modal */}
      <Modal
        visible={!!verifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyModal(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Review Document</Text>
              <TouchableOpacity onPress={() => setVerifyModal(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>
              {DOC_LABELS[verifyModal?.docType] || verifyModal?.docType}
            </Text>

            <Text style={s.fieldLabel}>Review Note (optional)</Text>
            <TextInput
              style={s.noteInput}
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="Add a note for the volunteer..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
            />

            <View style={s.verifyActions}>
              <TouchableOpacity
                style={[s.verifyBtn, { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }, verifying && { opacity: 0.5 }]}
                onPress={() => submitVerify("verified")}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#16A34A" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                    <Text style={[s.verifyBtnTxt, { color: "#16A34A" }]}>Verify</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.verifyBtn, { backgroundColor: "#FEE2E2", borderColor: "#DC2626" }, verifying && { opacity: 0.5 }]}
                onPress={() => submitVerify("rejected")}
                disabled={verifying}
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text style={[s.verifyBtnTxt, { color: "#DC2626" }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    paddingHorizontal: 16,
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
  headerTitle: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: "white",
  },
  deleteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(220,38,38,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "white",
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
  },
  profileTop: { flexDirection: "row", alignItems: "flex-start" },
  bigAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: { fontFamily: fonts.bodyBold, fontSize: 24, color: "white" },
  volName: { fontFamily: fonts.bodyBold, fontSize: 17, color: "#1F2937" },
  volEmail: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  volPhone: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 11 },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: radius.lg,
    padding: 12,
  },
  infoItem: { width: "47%", gap: 2 },
  infoLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#1F2937" },

  statusActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  actionPillTxt: { fontFamily: fonts.bodyBold, fontSize: 13 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: "#1F2937" },
  sectionCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: "#FEE8E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },

  emptySection: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptySectionTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  emptySectionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textDisabled, textAlign: "center" },

  docRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  docIconBox: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  docType: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#1F2937" },
  docDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  docNote: { fontFamily: fonts.body, fontSize: 11, color: "#D97706", marginTop: 2, fontStyle: "italic" },
  docStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start", marginTop: 4 },
  docStatusTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },
  docActions: { flexDirection: "row", gap: 4, alignItems: "center" },
  docActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  tourRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  tourDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  tourTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#1F2937" },
  tourMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  tourDate: { fontFamily: fonts.body, fontSize: 11, color: colors.primary, marginTop: 1 },
  tourStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  tourStatusTxt: { fontFamily: fonts.bodyBold, fontSize: 11 },

  dangerCard: { borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FFF5F5" },
  dangerTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#DC2626" },
  dangerSub: { fontFamily: fonts.body, fontSize: 13, color: "#6B7280" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
  },
  deleteBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },

  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  backLink: { marginTop: 16 },
  backLinkTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: "#1F2937" },
  modalSub: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  noteInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: radius.lg,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
    minHeight: 72,
    textAlignVertical: "top",
  },
  verifyActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  verifyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  verifyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
