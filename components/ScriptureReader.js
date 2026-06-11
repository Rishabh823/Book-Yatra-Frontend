// Reusable scripture reader with font-size control + autoscroll
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../lib/theme";

export default function ScriptureReader({
  title,
  subtitle,
  intro,
  verses,
  accentImage,
}) {
  const router = useRouter();
  const [fontSize, setFontSize] = useState(18);
  const [autoScroll, setAutoScroll] = useState(false);
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (autoScroll) {
      intervalRef.current = setInterval(() => {
        offsetRef.current += 1;
        scrollRef.current?.scrollTo({ y: offsetRef.current, animated: false });
      }, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [autoScroll]);

  const onScroll = (e) => {
    if (!autoScroll) offsetRef.current = e.nativeEvent.contentOffset.y;
  };

  const share = async () => {
    try {
      await Share.share({
        message:
          `${title}\n${subtitle}\n\n` + verses.map((v) => v.hi).join("\n\n"),
      });
    } catch {}
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={s.head}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconBtn}
          testID="reader-back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.sub}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          onPress={share}
          style={s.iconBtn}
          testID="reader-share"
        >
          <Ionicons name="share-outline" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity
          style={s.ctrlBtn}
          onPress={() => setFontSize((x) => Math.max(14, x - 2))}
          testID="font-decrease"
        >
          <Text style={s.ctrlText}>A−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.ctrlBtn}
          onPress={() => setFontSize((x) => Math.min(28, x + 2))}
          testID="font-increase"
        >
          <Text style={s.ctrlText}>A+</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[
            s.ctrlBtn,
            autoScroll && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setAutoScroll((v) => !v)}
          testID="auto-scroll"
        >
          <Ionicons
            name={autoScroll ? "pause" : "play"}
            size={12}
            color={autoScroll ? "#fff" : colors.secondary}
          />
          <Text
            style={[
              s.ctrlText,
              { marginLeft: 4 },
              autoScroll && { color: "#fff" },
            ]}
          >
            Auto
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: 24 }}>
          <LinearGradient colors={[colors.secondary, "#3D0D0C"]} style={s.hero}>
            <Text style={s.heroOm}>ॐ</Text>
            <Text style={s.heroTitle}>{title}</Text>
            <Text style={s.heroSub}>{subtitle}</Text>
            <View style={s.heroDivider} />
          </LinearGradient>
        </View>

        {intro ? (
          <View style={s.intro}>
            <Text style={s.introText}>{intro}</Text>
          </View>
        ) : null}

        {/* Verses */}
        <View style={s.body}>
          {verses.map((v, i) => (
            <View key={i} style={s.verseBlock}>
              <View style={s.verseHead}>
                <View style={s.verseNum}>
                  <Text style={s.verseNumText}>{i + 1}</Text>
                </View>
                {v.label ? <Text style={s.verseLabel}>{v.label}</Text> : null}
              </View>
              <Text style={[s.hi, { fontSize }]}>{v.hi}</Text>
              {v.en ? <Text style={s.en}>{v.en}</Text> : null}
              {i < verses.length - 1 && <View style={s.verseDivider} />}
            </View>
          ))}

          <View style={s.endNote}>
            <Text style={s.endOm}>
              ॥ इति श्री खाटू श्याम महिमा सम्पूर्णम् ॥
            </Text>
            <Text style={s.endEn}>· May Baba Shyam bless you ·</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.secondary },
  sub: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 2,
  },

  controls: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  ctrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ctrlText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.secondary,
  },

  hero: { padding: 28, borderRadius: radius.xxl, alignItems: "center" },
  heroOm: { fontSize: 48, color: "#FFE9C0", fontFamily: fonts.heading },
  heroTitle: {
    color: "#fff",
    fontFamily: fonts.heading,
    fontSize: 28,
    marginTop: 4,
    textAlign: "center",
  },
  heroSub: {
    color: "#FFE9C0",
    fontFamily: fonts.accent,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 6,
    textTransform: "uppercase",
  },
  heroDivider: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,233,192,0.6)",
    marginTop: 14,
  },

  intro: { paddingHorizontal: 24, paddingVertical: 18 },
  introText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
  },

  body: { paddingHorizontal: 24, paddingTop: 8 },
  verseBlock: { paddingVertical: 18 },
  verseHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  verseNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  verseNumText: {
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
  verseLabel: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  hi: {
    fontFamily: fonts.heading,
    color: colors.secondary,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  en: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
    fontStyle: "italic",
  },
  verseDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginTop: 18,
    opacity: 0.7,
  },

  endNote: { alignItems: "center", paddingTop: 40, paddingBottom: 24 },
  endOm: {
    fontFamily: fonts.heading,
    color: colors.primary,
    fontSize: 16,
    textAlign: "center",
  },
  endEn: {
    fontFamily: fonts.accent,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 8,
  },
});
