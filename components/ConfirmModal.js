import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow } from "../lib/theme";

/**
 * ConfirmModal — replaces all Alert.alert() across the app.
 *
 * Props:
 *   visible, title, message, confirmText, cancelText
 *   onConfirm, onCancel, onDismiss
 *   destructive — red confirm button
 *   icon — Ionicons name  e.g. "trash-outline"
 *   iconBg, iconColor — override icon circle colors
 */
export default function ConfirmModal({
  visible = false,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  onDismiss,
  destructive = false,
  icon,
  iconBg,
  iconColor,
}) {
  const accentColor = destructive ? colors.error : colors.primary;
  const iconBgColor = iconBg || (destructive ? "#FEF2F2" : colors.primaryLight);
  const iconTint = iconColor || (destructive ? colors.error : colors.primary);
  const dismiss = onCancel || onDismiss || (() => {});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable style={s.box} onPress={() => {}}>
          {icon ? (
            <View style={[s.iconCircle, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={28} color={iconTint} />
            </View>
          ) : null}
          {title ? <Text style={s.title}>{title}</Text> : null}
          {message ? <Text style={s.message}>{message}</Text> : null}
          <View style={s.row}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={dismiss}
              activeOpacity={0.7}
            >
              <Text style={s.cancelTxt}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: accentColor }]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={s.confirmTxt}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 24,
    alignItems: "center",
    ...shadow.card,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  confirmTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#fff",
  },
});
