import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { colors, fonts, radius } from "../lib/theme";

export default function ChatBubble({ message, isOwn, showName, senderName }) {
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
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
        style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
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
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  containerOwn: { alignItems: "flex-end" },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 16 },
  ownBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ownText: { color: "white" },
  time: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(0,0,0,0.4)",
    marginTop: 4,
    textAlign: "right",
  },
  timeOwn: { color: "rgba(255,255,255,0.7)" },
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
});
