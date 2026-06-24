import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, volunteerApi } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

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

export default function VolunteerManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const [volunteers, setVolunteers] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [assignModal, setAssignModal] = useState(null);
  const [assigningTourId, setAssigningTourId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const cf = (k, v) => setCreateForm((p) => ({ ...p, [k]: v }));

  // Change password state
  const [pwdModal, setPwdModal] = useState(null); // holds the volunteer object
  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const { toast, showToast, hideToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteVolTarget, setDeleteVolTarget] = useState(null); // { id, name }
  const [showRemoveTourConfirm, setShowRemoveTourConfirm] = useState(false);
  const [removeTourTarget, setRemoveTourTarget] = useState(null); // { volunteerId, tourId }
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null); // volunteer item

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    try {
      const [vRes, tRes] = await Promise.all([
        api.get("/volunteer/list"),
        api.get("/tours"),
      ]);
      const vList = Array.isArray(vRes) ? vRes : vRes.data || [];
      const tList = Array.isArray(tRes) ? tRes : tRes.data || [];
      setVolunteers(vList);
      setTours(tList);
    } catch (e) {
      showToast("Failed to load data", "error");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const updateStatus = async (volunteerId, status) => {
    try {
      await api.put("/volunteer/" + volunteerId + "/status", { status });
      setVolunteers((prev) =>
        prev.map((v) =>
          v._id === volunteerId ? { ...v, volunteerStatus: status } : v,
        ),
      );
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const assignToTour = async () => {
    if (!assigningTourId || !assignModal) return;
    setAssigning(true);
    try {
      await api.post("/volunteer/assign", {
        volunteerId: assignModal._id,
        tourId: assigningTourId,
      });
      const tour = tours.find((t) => t._id === assigningTourId);
      setVolunteers((prev) =>
        prev.map((v) =>
          v._id === assignModal._id
            ? {
                ...v,
                assignedTours: [...(v.assignedTours || []), tour].filter(
                  Boolean,
                ),
              }
            : v,
        ),
      );
      setAssignModal(null);
      setAssigningTourId(null);
      showToast("Volunteer assigned to tour successfully", "success");
    } catch {
      showToast("Failed to assign volunteer", "error");
    }
    setAssigning(false);
  };

  const deleteVolunteer = async (volunteerId, name) => {
    setDeleteVolTarget({ id: volunteerId, name });
    setShowDeleteConfirm(true);
  };

  const handleDeleteVolunteerConfirmed = async () => {
    if (!deleteVolTarget) return;
    setShowDeleteConfirm(false);
    try {
      await api.del("/volunteer/" + deleteVolTarget.id);
      setVolunteers((prev) => prev.filter((v) => v._id !== deleteVolTarget.id));
    } catch (e) {
      showToast(e.message || "Failed to delete volunteer", "error");
    }
    setDeleteVolTarget(null);
  };

  const createVolunteer = async () => {
    const { name, email, phone, password } = createForm;
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      showToast("All fields are required", "error"); return;
    }
    if (phone.length < 10) {
      showToast("Enter a valid phone number", "error"); return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await volunteerApi.create({ name, email, phone, password });
      const newVol = res?.data || res;
      setVolunteers((prev) => [{ ...newVol, assignedTours: [] }, ...prev]);
      setCreateForm({ name: "", email: "", phone: "", password: "" });
      setCreateModal(false);
      showToast(`${name} has been added as a volunteer and can now log in with their credentials.`, "success");
    } catch (e) {
      showToast(e.message || "Failed to create volunteer", "error");
    }
    setCreating(false);
  };

  const removeFromTour = async (volunteerId, tourId) => {
    setRemoveTourTarget({ volunteerId, tourId });
    setShowRemoveTourConfirm(true);
  };

  const handleRemoveTourConfirmed = async () => {
    if (!removeTourTarget) return;
    setShowRemoveTourConfirm(false);
    const { volunteerId, tourId } = removeTourTarget;
    try {
      await api.post("/volunteer/remove-tour", { volunteerId, tourId });
      setVolunteers((prev) =>
        prev.map((v) =>
          v._id === volunteerId
            ? {
                ...v,
                assignedTours: (v.assignedTours || []).filter(
                  (t) => t._id !== tourId,
                ),
              }
            : v,
        ),
      );
    } catch {
      showToast("Failed to remove volunteer from tour", "error");
    }
    setRemoveTourTarget(null);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error"); return;
    }
    setSavingPwd(true);
    try {
      await api.put("/volunteer/" + pwdModal._id + "/change-password", { newPassword });
      showToast(`Password updated for ${pwdModal.name}.`, "success");
      setPwdModal(null);
      setNewPassword("");
    } catch (e) {
      showToast(e.message || "Failed to update password.", "error");
    }
    setSavingPwd(false);
  };

  const filtered =
    tab === "all"
      ? volunteers
      : volunteers.filter((v) => (v.volunteerStatus || "active") === tab);

  const renderVolunteer = ({ item }) => {
    const status = item.volunteerStatus || "active";
    const sc = STATUS_COLOR[status] || STATUS_COLOR.pending;
    const assignedTours = item.assignedTours || [];
    const docsCount = (item.verificationDocs || []).length;
    const verifiedDocs = (item.verificationDocs || []).filter(
      (d) => d.status === "verified",
    ).length;

    return (
      <View style={s.card}>
        {/* Tappable top area — navigates to detail */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/admin/volunteer/${item._id}`)}
        >
          <View style={s.cardRow}>
            <View
              style={[
                s.avatar,
                { backgroundColor: status === "suspended" ? colors.textDisabled : colors.primary },
              ]}
            >
              <Text style={s.avatarText}>
                {(item.name || "V")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.volName}>{item.name || "Volunteer"}</Text>
              <Text style={s.volEmail}>{item.email || ""}</Text>
              <View style={s.metaRow}>
                <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: sc.color }]} />
                  <Text style={[s.statusText, { color: sc.color }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
                {docsCount > 0 && (
                  <View style={s.docsBadge}>
                    <Ionicons
                      name="document-text"
                      size={10}
                      color={verifiedDocs === docsCount ? "#16A34A" : "#D97706"}
                    />
                    <Text
                      style={[
                        s.docsText,
                        { color: verifiedDocs === docsCount ? "#16A34A" : "#D97706" },
                      ]}
                    >
                      {verifiedDocs}/{docsCount} docs
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
          </View>

          {assignedTours.length > 0 && (
            <View style={[s.tourCountRow, { marginTop: 10 }]}>
              <Ionicons name="bus-outline" size={13} color={colors.primary} />
              <Text style={s.tourCountTxt}>
                {assignedTours.length} tour{assignedTours.length !== 1 ? "s" : ""} assigned
              </Text>
              <Text style={s.tourNames} numberOfLines={1}>
                {assignedTours.slice(0, 2).map((t) => t.title).join(", ")}
                {assignedTours.length > 2 ? ` +${assignedTours.length - 2}` : ""}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action strip — outside the nav touchable so buttons fire cleanly */}
        <View style={s.actionStrip}>
          <TouchableOpacity
            style={s.stripBtn}
            onPress={() => { setAssignModal(item); setAssigningTourId(null); }}
          >
            <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
            <Text style={[s.stripBtnTxt, { color: colors.primary }]}>Assign Tour</Text>
          </TouchableOpacity>

          <View style={s.stripDivider} />

          {status !== "active" ? (
            <TouchableOpacity
              style={s.stripBtn}
              onPress={() => updateStatus(item._id, "active")}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
              <Text style={[s.stripBtnTxt, { color: "#16A34A" }]}>Activate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.stripBtn}
              onPress={() => {
                setSuspendTarget(item);
                setShowSuspendConfirm(true);
              }}
            >
              <Ionicons name="pause-circle-outline" size={14} color="#D97706" />
              <Text style={[s.stripBtnTxt, { color: "#D97706" }]}>Suspend</Text>
            </TouchableOpacity>
          )}

          <View style={s.stripDivider} />

          <TouchableOpacity
            style={s.stripBtn}
            onPress={() => { setPwdModal(item); setNewPassword(""); setShowNewPwd(false); }}
          >
            <Ionicons name="key-outline" size={14} color="#7C3AED" />
            <Text style={[s.stripBtnTxt, { color: "#7C3AED" }]}>Password</Text>
          </TouchableOpacity>

          <View style={s.stripDivider} />

          <TouchableOpacity
            style={s.stripBtn}
            onPress={() => deleteVolunteer(item._id, item.name)}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
            <Text style={[s.stripBtnTxt, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const stats = {
    total: volunteers.length,
    active: volunteers.filter(
      (v) => (v.volunteerStatus || "active") === "active",
    ).length,
    pending: volunteers.filter((v) => v.volunteerStatus === "pending").length,
    suspended: volunteers.filter((v) => v.volunteerStatus === "suspended")
      .length,
  };

  const TABS = [
    { k: "all", label: "All", icon: "people", count: stats.total },
    {
      k: "active",
      label: "Active",
      icon: "checkmark-circle",
      count: stats.active,
    },
    { k: "pending", label: "Pending", icon: "time", count: stats.pending },
    {
      k: "suspended",
      label: "Suspended",
      icon: "pause-circle",
      count: stats.suspended,
    },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Volunteer Management</Text>
          <Text style={s.subtitle}>
            {stats.total} volunteers · {stats.active} active
          </Text>
        </View>
        <TouchableOpacity
          style={s.createHeaderBtn}
          onPress={() => setCreateModal(true)}
        >
          <Ionicons name="person-add" size={16} color={colors.primary} />
          <Text style={s.createHeaderBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: "Total", count: stats.total, color: colors.primary },
          { label: "Active", count: stats.active, color: "#16A34A" },
          { label: "Pending", count: stats.pending, color: "#D97706" },
          { label: "Suspended", count: stats.suspended, color: "#DC2626" },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={[s.statCount, { color: stat.color }]}>
              {stat.count}
            </Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Segmented Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.segmentWrapper}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.k}
            style={[s.segment, tab === t.k && s.segmentActive]}
            onPress={() => setTab(t.k)}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, tab === t.k && s.segmentTextActive]}>
              {t.label}
            </Text>
            {t.count > 0 && (
              <View
                style={[s.segmentBadge, tab === t.k && s.segmentBadgeActive]}
              >
                <Text
                  style={[
                    s.segmentBadgeTxt,
                    tab === t.k && s.segmentBadgeTxtActive,
                  ]}
                >
                  {t.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderVolunteer}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.textDisabled}
              />
              <Text style={s.emptyText}>No volunteers in this category</Text>
              <Text style={s.emptySub}>
                Users with volunteer role will appear here
              </Text>
            </View>
          }
        />
      )}

      {/* Create Volunteer Modal */}
      <Modal
        visible={createModal}
        transparent
        animationType="slide"
        onRequestClose={() => !creating && setCreateModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Create Volunteer</Text>
              {/* <TouchableOpacity
                onPress={() => setCreateModal(false)}
                disabled={creating}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity> */}
            </View>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              This volunteer will be linked to your operator account and visible
              only to you.
            </Text>

            {[
              {
                key: "name",
                label: "Full Name",
                placeholder: "e.g. Ramesh Kumar",
                icon: "person-outline",
              },
              {
                key: "email",
                label: "Email Address",
                placeholder: "volunteer@email.com",
                icon: "mail-outline",
                keyboard: "email-address",
              },
              {
                key: "phone",
                label: "Phone Number",
                placeholder: "98765 43210",
                icon: "call-outline",
                keyboard: "phone-pad",
              },
            ].map((f) => (
              <View key={f.key} style={s.createField}>
                <Text style={s.createLabel}>{f.label}</Text>
                <View style={s.createInputRow}>
                  <Ionicons
                    name={f.icon}
                    size={16}
                    color={colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={s.createInput}
                    value={createForm[f.key]}
                    onChangeText={(v) => cf(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textDisabled}
                    keyboardType={f.keyboard || "default"}
                    autoCapitalize={f.key === "name" ? "words" : "none"}
                  />
                </View>
              </View>
            ))}

            <View style={s.createField}>
              <Text style={s.createLabel}>Password</Text>
              <View style={s.createInputRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[s.createInput, { flex: 1 }]}
                  value={createForm.password}
                  onChangeText={(v) => cf("password", v)}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[
                  s.assignConfirmBtn,
                  { flex: 1, backgroundColor: colors.elevated },
                ]}
                onPress={() => setCreateModal(false)}
                disabled={creating}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.assignConfirmBtn,
                  { flex: 2 },
                  creating && { opacity: 0.6 },
                ]}
                onPress={createVolunteer}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="white" />
                    <Text style={s.assignConfirmText}>Create Volunteer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tour assignment modal */}
      <Modal
        visible={!!assignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModal(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Tour</Text>
              <TouchableOpacity onPress={() => setAssignModal(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalVolName}>
              Volunteer:{" "}
              <Text style={{ color: colors.primary }}>{assignModal?.name}</Text>
            </Text>

            <Text style={s.tourListLabel}>Select a tour to assign:</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tours
                .filter((t) => {
                  const assigned = assignModal?.assignedTours || [];
                  return !assigned.some((a) => a._id === t._id);
                })
                .map((t) => (
                  <TouchableOpacity
                    key={t._id}
                    style={[
                      s.tourOption,
                      assigningTourId === t._id && s.tourOptionActive,
                    ]}
                    onPress={() => setAssigningTourId(t._id)}
                  >
                    <View style={s.tourOptionLeft}>
                      <Ionicons
                        name="bus-outline"
                        size={18}
                        color={
                          assigningTourId === t._id
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <View>
                        <Text
                          style={[
                            s.tourOptionTitle,
                            assigningTourId === t._id && {
                              color: colors.primary,
                            },
                          ]}
                        >
                          {t.title}
                        </Text>
                        <Text style={s.tourOptionMeta}>
                          {t.source} → {t.destination} · {fmtDate(t.startDate)}
                        </Text>
                      </View>
                    </View>
                    {assigningTourId === t._id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              {tours.filter(
                (t) =>
                  !(assignModal?.assignedTours || []).some(
                    (a) => a._id === t._id,
                  ),
              ).length === 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.textSecondary,
                    padding: 20,
                    fontFamily: fonts.body,
                  }}
                >
                  All active tours already assigned
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                s.assignConfirmBtn,
                (!assigningTourId || assigning) && { opacity: 0.5 },
              ]}
              onPress={assignToTour}
              disabled={!assigningTourId || assigning}
            >
              {assigning ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={s.assignConfirmText}>Confirm Assignment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={!!pwdModal}
        transparent
        animationType="slide"
        onRequestClose={() => !savingPwd && setPwdModal(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPwdModal(null)} disabled={savingPwd}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
              Set a new password for{" "}
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.secondary }}>
                {pwdModal?.name}
              </Text>
              . They will need this to log in.
            </Text>

            <View style={s.createField}>
              <Text style={s.createLabel}>New Password</Text>
              <View style={s.createInputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.createInput, { flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showNewPwd}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowNewPwd(p => !p)} style={{ padding: 4 }}>
                  <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[s.assignConfirmBtn, { flex: 1, backgroundColor: colors.elevated }]}
                onPress={() => setPwdModal(null)}
                disabled={savingPwd}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.assignConfirmBtn, { flex: 2, backgroundColor: "#7C3AED" }, savingPwd && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={savingPwd}
              >
                {savingPwd ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="key" size={16} color="white" />
                    <Text style={s.assignConfirmText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Volunteer"
        message={`Remove ${deleteVolTarget?.name} as a volunteer? This cannot be undone and will unassign them from all tours.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteVolunteerConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
      <ConfirmModal
        visible={showRemoveTourConfirm}
        title="Remove from Tour"
        message="Remove this volunteer from the tour?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveTourConfirmed}
        onCancel={() => setShowRemoveTourConfirm(false)}
        onDismiss={() => setShowRemoveTourConfirm(false)}
        destructive
      />
      <ConfirmModal
        visible={showSuspendConfirm}
        title="Suspend Volunteer"
        message={`Suspend ${suspendTarget?.name}?`}
        confirmText="Suspend"
        cancelText="Cancel"
        onConfirm={() => { setShowSuspendConfirm(false); updateStatus(suspendTarget._id, "suspended"); setSuspendTarget(null); }}
        onCancel={() => setShowSuspendConfirm(false)}
        onDismiss={() => setShowSuspendConfirm(false)}
        destructive
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.elevated },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Philosopher_700Bold", fontSize: 20, color: colors.textPrimary },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevated,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: colors.elevated,
    borderRadius: 16,
  },
  statCount: { fontFamily: fonts.bodyBold, fontSize: 20 },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevated,
    minHeight: 52,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    alignSelf: "center",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tabTextActive: { color: "white" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: "white" },
  volName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  volEmail: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  volMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: "capitalize",
  },

  toursSection: {
    backgroundColor: colors.elevated,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  toursSectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  tourRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tourDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  tourTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  tourMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  removeBtn: { padding: 4 },

  actions: { flexDirection: "row", gap: 8 },
  assignBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#FEE8E2",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  assignBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  activateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#16A34A30",
  },
  suspendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 13 },

  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.borderSubtle,
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: colors.textPrimary,
  },
  modalVolName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  tourListLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tourOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    marginBottom: 8,
    gap: 10,
  },
  tourOptionActive: { borderColor: colors.primary, backgroundColor: "#FEE8E2" },
  tourOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  tourOptionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tourOptionMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assignConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  assignConfirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "white",
  },
  createHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  createHeaderBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  createField: { marginBottom: 12 },
  createLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  createInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.elevated,
  },
  createInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Segmented tabs — compact chip style
  segmentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.elevated,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  segmentTextActive: { color: "white" },
  segmentBadge: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
  },
  segmentBadgeActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  segmentBadgeTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  segmentBadgeTxtActive: { color: "white" },

  // Card new styles
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  docsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  docsText: { fontFamily: fonts.bodyBold, fontSize: 10 },
  tourCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tourCountTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  tourNames: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.elevated,
    paddingTop: 10,
    marginTop: 2,
  },
  stripBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  stripBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  stripDivider: { width: 1, height: 20, backgroundColor: colors.borderSubtle },
});
