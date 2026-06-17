import { useState } from "react";
import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

export default function FallbackImage({
  source,
  style,
  resizeMode,
  iconSize,
  iconColor,
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !source?.uri) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: colors.primaryLight,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Ionicons
          name="image-outline"
          size={iconSize || 36}
          color={iconColor || colors.primary}
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode || "cover"}
      onError={() => setFailed(true)}
    />
  );
}
