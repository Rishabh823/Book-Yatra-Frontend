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

/**
 * WhatsApp-style tick indicator for own messages.
 *
 * sending  → clock spinner (grey)
 * sent     → single grey tick  ✓
 * read     → double orange tick ✓✓
 * failed   → red alert icon + "Tap to retry"
 */
function MessageTick({ status, isRead, onRetry }) {
  if (status === "sending") {
    return (
      <View style={st.row}>
        <ActivityIndicator size={10} color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  if (status === "failed") {
    return (
      <TouchableOpacity style={st.row} onPress={onRetry} activeOpacity={0.7}>
        <Ionicons name="alert-circle" size={13} color="#FF6B6B" />
        <Text style={st.failText}>Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  // sent or delivered — show single tick; if read show double coloured tick
  if (isRead) {
    // Double tick — orange (read by recipient)
    return (
      <View style={st.row}>
        <View style={st.doubleTick}>
          <Ionicons name="checkmark" size={12} color="#D95D39" style={st.tick1} />
          <Ionicons name="checkmark" size={12} color="#D95D39" style={st.tick2} />
        </View>
      </View>
    );
  }

  // Single tick — white/grey (delivered to server, not yet read)
  return (
    <View style={st.row}>
      <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.7)" />
    </View>
  );
}

export default function ChatBubble({
  message,
  isOwn,
  isRead,
  showName,
  senderName,
  onRetry,
  onLongPress,
}) {
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const status = message._status || "sent";
  const isFailed = status === "failed";

  if (message.type === "system") {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  // ── Deleted-for-everyone placeholder ────────────────────────────────────────
  if (message.isDeleted || message.type === "deleted") {
    const deletedLabel = isOwn ? "You deleted this message" : "This message was deleted";
    return (
      <View style={[styles.container, isOwn && styles.containerOwn]}>
        <View style={[styles.deletedBubble, isOwn ? styles.deletedOwn : styles.deletedOther]}>
          <Ionicons
            name="ban-outline"
            size={13}
            color={isOwn ? "rgba(255,255,255,0.55)" : "#9CA3AF"}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.deletedText, isOwn && styles.deletedTextOwn]}>
            {deletedLabel}
          </Text>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther, { marginLeft: 8 }]}>
            {time}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      {!isOwn && showName && (
        <Text style={styles.senderName}>{senderName || "Unknown"}</Text>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        delayLongPress={350}
        onLongPress={() => onLongPress?.(message)}
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
            {message.text}
          </Text>
        )}

        {/* Time + tick row — only own messages show a tick */}
        <View style={styles.metaRow}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {time}
          </Text>
          {isOwn && (
            <MessageTick
              status={status}
              isRead={isRead}
              onRetry={() => onRetry?.(message._id, message.text)}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Failed — extra retry banner below bubble */}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 3,
  },
  failText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "#FF6B6B",
    marginLeft: 3,
  },
  doubleTick: {
    flexDirection: "row",
    alignItems: "center",
    width: 18,
  },
  tick1: {
    position: "absolute",
    left: 0,
  },
  tick2: {
    position: "absolute",
    left: 5,
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
  failedBubble: { opacity: 0.75 },

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
  },
  timeOwn: { color: "rgba(255,255,255,0.65)" },
  timeOther: { color: "rgba(0,0,0,0.35)" },

  messageImage: { width: 200, height: 150, borderRadius: 8 },

  // Deleted-for-everyone placeholder
  deletedBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: "78%",
  },
  deletedOwn: {
    backgroundColor: "rgba(217,93,57,0.55)",
    borderColor: "rgba(217,93,57,0.3)",
    borderBottomRightRadius: 4,
  },
  deletedOther: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 4,
  },
  deletedText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontStyle: "italic",
    color: "#9CA3AF",
    flex: 1,
  },
  deletedTextOwn: { color: "rgba(255,255,255,0.7)" },

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
