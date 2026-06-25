import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../lib/theme";

// Status indicator shown on own messages (bottom-right corner of bubble)
function MessageStatus({ status, onRetry, text }) {
  if (status === "sending") {
    return (
      <View style={st.statusRow}>
        <ActivityIndicator size={10} color="rgba(255,255,255,0.7)" />
      </View>
    );
  }
  if (status === "failed") {
    return (
      <TouchableOpacity
        style={st.failedRow}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <Ionicons name="alert-circle" size={13} color="#FF6B6B" />
        <Text style={st.failedText}>Tap to retry</Text>
      </TouchableOpacity>
    );
  }
  if (status === "sent") {
    return (
      <View style={st.statusRow}>
        <Ionicons
          name="checkmark-done"
          size={13}
          color="rgba(255,255,255,0.75)"
        />
      </View>
    );
  }
  return null;
}

export default function ChatBubble({
  message,
  isOwn,
  showName,
  senderName,
  onRetry,
}) {
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const status = message._status || null;
  const isFailed = status === "failed";

  if (message.type === "system") {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      {!isOwn && showName && (
        <Text style={styles.senderName}>{senderName || "Unknown"}</Text>
      )}

      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          isFailed && styles.failedBubble,
        ]}
      >
        {message.type === "image" && message.mediaUrl ? (
          <Image
            source={{ uri: message.mediaUrl }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.msgText, isOwn && styles.ownText]}>
            {message.isDeleted ? "This message was deleted" : message.text}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
          {isOwn && (
            <MessageStatus
              status={status}
              onRetry={() => onRetry?.(message._id, message.text)}
            />
          )}
        </View>
      </View>

      {/* Failed: show retry below the bubble */}
      {isFailed && isOwn && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => onRetry?.(message._id, message.text)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={12} color="#FF6B6B" />
          <Text style={styles.retryText}>Failed — tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  failedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 4,
  },
  failedText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "#FF6B6B",
  },
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  containerOwn: { alignItems: "flex-end" },

  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 4,
  },
  failedBubble: {
    opacity: 0.75,
  },

  msgText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ownText: { color: "white" },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
    gap: 2,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(0,0,0,0.35)",
  },
  timeOwn: { color: "rgba(255,255,255,0.65)" },

  messageImage: { width: 200, height: 150, borderRadius: 8 },

  senderName: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    marginBottom: 2,
    marginLeft: 4,
  },
  systemWrap: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  systemText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "#FF6B6B18",
  },
  retryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: "#FF6B6B",
  },
});
