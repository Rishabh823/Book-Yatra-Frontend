import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { fonts } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";

const DOC_TYPES = {
  aadhaar: { icon: "card", label: "Aadhaar", color: "#2563EB", bg: "#DBEAFE" },
  passport: {
    icon: "airplane",
    label: "Passport",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  visa: { icon: "earth", label: "Visa", color: "#0891B2", bg: "#CFFAFE" },
  driving_license: {
    icon: "car",
    label: "License",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  pan: {
    icon: "document-text",
    label: "PAN Card",
    color: "#16A34A",
    bg: "#DCFCE7",
  },
  other: { icon: "document", label: "Other", color: "#6B7280", bg: "#F3F4F6" },
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const getExpiryStatus = (expiresAt) => {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000);
  if (days <= 0) return { color: "#DC2626", label: "Expired" };
  if (days <= 30) return { color: "#DC2626", label: days + " days left" };
  if (days <= 90) return { color: "#D97706", label: days + " days left" };
  return { color: "#16A34A", label: fmtDate(expiresAt) };
};

export default function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const themeColors = useColors();
  const styles = useMemo(() => makeStyles(themeColors), [themeColors]);
  const { toast, showToast, hideToast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/documents");
      setDocs(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (doc) => {
    setPendingDeleteDoc(doc);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteDoc) return;
    try {
      await api.del("/documents/" + pendingDeleteDoc._id);
      setDocs((prev) => prev.filter((d) => d._id !== pendingDeleteDoc._id));
    } catch {
      showToast("Failed to delete", "error");
    }
    setPendingDeleteDoc(null);
  };

  const renderDoc = ({ item }) => {
    const type = DOC_TYPES[item.type] || DOC_TYPES.other;
    const expiry = getExpiryStatus(item.expiresAt);
    return (
      <View style={styles.docCard}>
        <View style={[styles.docIcon, { backgroundColor: type.bg }]}>
          <Ionicons name={type.icon} size={22} color={type.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.docHeader}>
            <Text style={styles.docTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.docType}>{type.label}</Text>
          {expiry && (
            <Text style={[styles.docExpiry, { color: expiry.color }]}>
              Expires: {expiry.label}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Document Vault</Text>
          <Text style={styles.subtitle}>
            {docs.length} doc{docs.length !== 1 ? "s" : ""} stored
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/document-vault/add")}
        >
          <Ionicons name="add" size={22} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.grayBand} />

      {loading ? (
        <ActivityIndicator color="#D95D39" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderDoc}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#D95D39"
              colors={["#D95D39"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={40}
                  color={themeColors.textDisabled}
                />
              </View>
              <Text style={styles.emptyTitle}>Your vault is empty</Text>
              <Text style={styles.emptySub}>
                Securely store your travel documents here
              </Text>
              <TouchableOpacity
                style={styles.addDocBtn}
                onPress={() => router.push("/document-vault/add")}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addDocText}>Add Document</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmModal
        visible={!!pendingDeleteDoc}
        title="Delete Document"
        message={'Delete "' + (pendingDeleteDoc?.title || "") + '"? This cannot be undone.'}
        confirmText="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDeleteDoc(null)}
        onDismiss={() => setPendingDeleteDoc(null)}
        destructive={true}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Philosopher_700Bold",
    fontSize: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  grayBand: {
    height: 10,
    backgroundColor: colors.elevated,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  docTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#16A34A" },
  docType: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  docExpiry: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D95D39",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 24,
  },
  addDocText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "white" },
});
