import React from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../lib/theme";

/**
 * Slide-up modal showing another user's profile inside a chat.
 *
 * Props:
 *  visible      – boolean
 *  user         – { name, photoUrl, phone, email, role }
 *  iBlocked     – true if the current user has blocked this person
 *  blockedByThem – true if this person has blocked the current user
 *  onBlock      – () => void
 *  onUnblock    – () => void
 *  onClose      – () => void
 *  loading      – bool (show spinner while fetching)
 */
export default function UserProfileModal({
  visible,
  user,
  iBlocked,
  blockedByThem,
  onBlock,
  onUnblock,
  onClose,
  loading = false,
}) {
  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              {/* Drag handle */}
              <View style={s.handle} />

              {/* Close button */}
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>

              {loading ? (
                <ActivityIndicator color="#D95D39" style={{ marginVertical: 40 }} />
              ) : (
                <>
                  {/* Avatar */}
                  <View style={s.avatarWrap}>
                    {user?.photoUrl ? (
                      <Image source={{ uri: user.photoUrl }} style={s.avatar} />
                    ) : (
                      <View style={s.avatarFallback}>
                        <Text style={s.avatarInitials}>{initials}</Text>
                      </View>
                    )}
                    {/* Blocked-by-them indicator on avatar */}
                    {blockedByThem && !iBlocked && (
                      <View style={s.blockedBadge}>
                        <Ionicons name="ban" size={14} color="white" />
                      </View>
                    )}
                  </View>

                  {/* Name */}
                  <Text style={s.name}>{user?.name || "Unknown"}</Text>

                  {/* Role chip */}
                  {user?.role && user.role !== "user" && (
                    <View style={s.roleChip}>
                      <Text style={s.roleText}>{user.role}</Text>
                    </View>
                  )}

                  {/* Block status banners */}
                  {blockedByThem && !iBlocked && (
                    <View style={[s.banner, s.bannerGrey]}>
                      <Ionicons name="ban-outline" size={15} color="#6B7280" style={{ marginRight: 6 }} />
                      <Text style={s.bannerTextGrey}>
                        You can't send messages to this user
                      </Text>
                    </View>
                  )}
                  {iBlocked && (
                    <View style={[s.banner, s.bannerOrange]}>
                      <Ionicons name="ban-outline" size={15} color="#D95D39" style={{ marginRight: 6 }} />
                      <Text style={s.bannerTextOrange}>You have blocked this user</Text>
                    </View>
                  )}

                  {/* Divider */}
                  <View style={s.divider} />

                  {/* Block / Unblock button */}
                  {iBlocked ? (
                    <TouchableOpacity style={[s.actionBtn, s.unblockBtn]} onPress={onUnblock} activeOpacity={0.8}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                      <Text style={[s.actionBtnText, { color: "#16A34A" }]}>Unblock User</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[s.actionBtn, s.blockBtn]} onPress={onBlock} activeOpacity={0.8}>
                      <Ionicons name="ban-outline" size={18} color="#DC2626" />
                      <Text style={[s.actionBtnText, { color: "#DC2626" }]}>Block User</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    padding: 4,
  },
  avatarWrap: {
    position: "relative",
    marginTop: 8,
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#D95D39",
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#D6E4FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#D95D39",
  },
  avatarInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    color: "#1E3A5F",
  },
  blockedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  roleChip: {
    backgroundColor: "#FFF0EB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  roleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#D95D39",
    textTransform: "capitalize",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    width: "100%",
  },
  bannerGrey: { backgroundColor: "#F3F4F6" },
  bannerOrange: { backgroundColor: "#FFF0EB" },
  bannerTextGrey: { fontFamily: fonts.body, fontSize: 13, color: "#6B7280", flex: 1 },
  bannerTextOrange: { fontFamily: fonts.body, fontSize: 13, color: "#D95D39", flex: 1 },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: "center",
  },
  blockBtn: { backgroundColor: "#FEF2F2" },
  unblockBtn: { backgroundColor: "#F0FDF4" },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
