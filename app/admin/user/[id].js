import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdminShell } from "../../../lib/AdminScreen";
import { colors, fonts, radius } from "../../../lib/theme";
import { api, auth as authApi } from "../../../lib/api";
import { useColors } from "../../../lib/ThemeContext";
import ConfirmModal from "../../../components/ConfirmModal";

const ROLES = ["user", "volunteer", "manager", "admin"];
const ROLE_COLORS = {
  admin: "#DC2626",
  manager: "#EA580C",
  volunteer: "#16A34A",
  user: "#6B7280",
};

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [currentRole, setCurrentRole] = useState("manager");
  const [myOperatorId, setMyOperatorId] = useState(null);
  const [blocking, setBlocking]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", age: "", role: "user" });
  const [pwdForm, setPwdForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNewPwd, setShowNewPwd]       = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const isSuperAdmin = currentRole === "super_admin";
  const isAdmin      = currentRole === "admin" || isSuperAdmin;

  const isBlockedByMe = () => {
    if (!myOperatorId || !user) return false;
    const blocked = user.blockedByOperators || user.blockedOperators || [];
    return blocked.some(op =>
      (typeof op === "object" ? String(op._id) : String(op)) === myOperatorId
    );
  };

  const toggleBlock = () => {
    if (!myOperatorId || !user) return;
    const blocked = isBlockedByMe();
    Alert.alert(
      blocked ? "Unblock User" : "Block User",
      blocked
        ? `Allow ${user.name} to see your operator's tours again?`
        : `Block ${user.name} from seeing your operator's tours?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: blocked ? "Unblock" : "Block",
          style: blocked ? "default" : "destructive",
          onPress: async () => {
            setBlocking(true);
            try {
              const action = blocked ? "unblock" : "block";
              await api.post(`/users/${id}/${action}-for-operator`, { operatorId: myOperatorId });
              const current = user.blockedByOperators || user.blockedOperators || [];
              const updated = blocked
                ? current.filter(op => (typeof op === "object" ? String(op._id) : String(op)) !== myOperatorId)
                : [...current, myOperatorId];
              setUser(u => ({ ...u, blockedByOperators: updated }));
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to update block status.");
            } finally {
              setBlocking(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const init = async () => {
      const role = await authApi.getRole();
      setCurrentRole(role || "manager");
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const me = JSON.parse(stored);
        setMyOperatorId(me?._id ? String(me._id) : null);
      }
    };
    init();
  }, []);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      const u = res?.data || res;
      setUser(u);
      setForm({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || u.mobile || "",
        age: u.age ? String(u.age) : "",
        role: u.role || "user",
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load user");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveDetails = async () => {
    if (!form.name || !form.phone) {
      Alert.alert("Required", "Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        age: form.age ? Number(form.age) : undefined,
        role: form.role,
      });
      Alert.alert("Saved", "User details updated successfully");
      setUser((u) => ({ ...u, ...form }));
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 6) {
      Alert.alert("Invalid", "Password must be at least 6 characters");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${id}`, { password: pwdForm.newPassword });
      Alert.alert("Done", "Password changed successfully");
      setPwdForm({ newPassword: "", confirmPassword: "" });
      setShowPwd(false);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = () => setShowDeleteConfirm(true);

  const performDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await api.del(`/users/${id}`);
      router.back();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to delete user");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="User Details" subtitle="Loading...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </AdminShell>
    );
  }

  const initials = (user?.name || "?").charAt(0).toUpperCase();
  const roleColor = ROLE_COLORS[user?.role] || colors.textSecondary;

  return (
    <AdminShell title="User Details" subtitle={user?.name || "Edit user"}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
      >
        {/* User avatar + meta */}
        <View style={s.avatarSection}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPlaceholder]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={s.avatarMeta}>
            <Text style={s.userName}>{user?.name}</Text>
            <View style={[s.roleBadge, { backgroundColor: roleColor + "18" }]}>
              <Text style={[s.roleText, { color: roleColor }]}>
                {(user?.role || "user").toUpperCase()}
              </Text>
            </View>
            <Text style={s.userSince}>
              Joined{" "}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </Text>
          </View>
        </View>

        {/* Block / Unblock — managers with an operator context */}
        {myOperatorId && (
          <TouchableOpacity
            style={[s.blockBtn, isBlockedByMe() && s.blockBtnActive]}
            onPress={toggleBlock}
            disabled={blocking}
          >
            {blocking ? (
              <ActivityIndicator color={isBlockedByMe() ? colors.primary : "#DC2626"} />
            ) : (
              <>
                <Ionicons
                  name={isBlockedByMe() ? "lock-open-outline" : "ban-outline"}
                  size={16}
                  color={isBlockedByMe() ? colors.primary : "#DC2626"}
                />
                <Text style={[s.blockBtnTxt, isBlockedByMe() && { color: colors.primary }]}>
                  {isBlockedByMe() ? "Unblock from Your Tours" : "Block from Your Tours"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Joined Operators */}
        {Array.isArray(user?.joinedOperators) && user.joinedOperators.length > 0 && (
          <>
            <Text style={s.sectionLabel}>· Joined Operators ·</Text>
            <View style={[s.card, { marginBottom: 20 }]}>
              {user.joinedOperators.map((op, i) => {
                const opId = typeof op === "object" ? String(op._id) : String(op);
                const opName = typeof op === "object" ? (op.businessName || op.name || opId) : opId;
                return (
                  <View key={opId} style={[s.opRow, i < user.joinedOperators.length - 1 && s.opRowBorder]}>
                    <View style={s.opIcon}>
                      <Ionicons name="bus" size={16} color={colors.primary} />
                    </View>
                    <Text style={s.opName} numberOfLines={1}>{opName}</Text>
                    {isSuperAdmin && (
                      <TouchableOpacity
                        style={s.opRemoveBtn}
                        onPress={() => {
                          Alert.alert(
                            "Remove Operator",
                            `Remove ${opName} from ${user.name}'s operators?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    const remaining = user.joinedOperators
                                      .filter((o) => (typeof o === "object" ? String(o._id) : String(o)) !== opId)
                                      .map((o) => typeof o === "object" ? String(o._id) : String(o));
                                    await api.post(`/users/${id}/set-operators`, { operatorIds: remaining });
                                    setUser((u) => ({
                                      ...u,
                                      joinedOperators: u.joinedOperators.filter((o) =>
                                        (typeof o === "object" ? String(o._id) : String(o)) !== opId
                                      ),
                                    }));
                                  } catch (e) {
                                    // fallback: use join-operators with remaining list
                                    Alert.alert("Error", e.message || "Failed to remove operator.");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Edit Details — admin & super_admin only */}
        {isAdmin && <Text style={s.sectionLabel}>· Edit Details ·</Text>}
        {isAdmin && <View style={s.card}>
          {[
            {
              k: "name",
              label: "Full Name",
              icon: "person-outline",
              kb: "default",
            },
            {
              k: "email",
              label: "Email",
              icon: "mail-outline",
              kb: "email-address",
            },
            {
              k: "phone",
              label: "Phone",
              icon: "call-outline",
              kb: "phone-pad",
            },
            {
              k: "age",
              label: "Age",
              icon: "calendar-outline",
              kb: "number-pad",
            },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons
                  name={f.icon}
                  size={16}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={s.input}
                  value={form[f.k]}
                  onChangeText={(v) => setF(f.k, v)}
                  keyboardType={f.kb}
                  placeholder={f.label}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            </View>
          ))}

          {/* Role selector */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Role</Text>
            <View style={s.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    s.roleChip,
                    form.role === r && {
                      backgroundColor:
                        (ROLE_COLORS[r] || colors.primary) + "20",
                      borderColor: ROLE_COLORS[r] || colors.primary,
                    },
                  ]}
                  onPress={() => setF("role", r)}
                >
                  <Text
                    style={[
                      s.roleChipText,
                      form.role === r && {
                        color: ROLE_COLORS[r] || colors.primary,
                        fontFamily: fonts.bodyBold,
                      },
                    ]}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={s.cta}
            onPress={saveDetails}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={s.ctaText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>}

        {/* Change Password + Danger Zone — super_admin only */}
        {isSuperAdmin && (
          <>
            <TouchableOpacity
              style={s.expandHeader}
              onPress={() => setShowPwd((v) => !v)}
            >
              <View style={s.expandHeaderLeft}>
                <View style={s.expandIconBg}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
                </View>
                <Text style={s.expandTitle}>Change Password</Text>
              </View>
              <Ionicons
                name={showPwd ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showPwd && (
              <View style={s.card}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>New Password</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
                    <TextInput
                      style={s.input}
                      value={pwdForm.newPassword}
                      onChangeText={(v) => setPwdForm((f) => ({ ...f, newPassword: v }))}
                      secureTextEntry={!showNewPwd}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={colors.textDisabled}
                    />
                    <TouchableOpacity onPress={() => setShowNewPwd((v) => !v)}>
                      <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>Confirm Password</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
                    <TextInput
                      style={s.input}
                      value={pwdForm.confirmPassword}
                      onChangeText={(v) => setPwdForm((f) => ({ ...f, confirmPassword: v }))}
                      secureTextEntry={!showConfirmPwd}
                      placeholder="Re-enter password"
                      placeholderTextColor={colors.textDisabled}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPwd((v) => !v)}>
                      <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={s.ctaSecondary} onPress={changePassword} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={16} color={colors.primary} />
                      <Text style={s.ctaSecondaryText}>Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <Text style={s.sectionLabel}>· Danger Zone ·</Text>
            <View style={[s.card, { borderWidth: 1, borderColor: "#FCA5A5" }]}>
              <Text style={s.dangerDesc}>
                Permanently delete this user and all their data. This action cannot be undone.
              </Text>
              <TouchableOpacity style={s.deleteBtn} onPress={deleteUser} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={s.deleteBtnText}>Delete User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete User"
        message={`Permanently delete "${user?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={performDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        onDismiss={() => setShowDeleteConfirm(false)}
        destructive
      />
    </AdminShell>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    backgroundColor: colors.primary + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.heading, fontSize: 28, color: "#fff" },
  avatarMeta: { flex: 1, gap: 6 },
  userName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5 },
  userSince: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    height: 50,
  },

  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  roleChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  ctaText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: 6,
  },
  ctaSecondaryText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },

  expandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  expandHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  expandIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  expandTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },

  dangerDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },
  deleteBtnText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },

  opRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
  },
  opRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  opIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary + "18",
    alignItems: "center", justifyContent: "center",
  },
  opName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  opRemoveBtn: { padding: 2 },

  blockBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: 999, marginBottom: 20,
    borderWidth: 1.5, borderColor: "#DC262640", backgroundColor: "#DC262618",
  },
  blockBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  blockBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#DC2626" },
});
