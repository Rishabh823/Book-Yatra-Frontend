import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { useLang } from "../../lib/LanguageContext";

// Curated devotional tracks - using publicly known URLs of Khatu Shyam bhajans
const TRACKS = [
  {
    id: "1",
    title: "Shyam Diwane",
    artist: "Khatu Bhakti",
    duration: "4:21",
    art: "https://images.pexels.com/photos/31331442/pexels-photo-31331442.jpeg",
    url: "https://shyamsawariyaparivar.com/khatuSongs/Shyam%20diwane%20jo%20shyam%20diwane.mp3",
  },
  {
    id: "2",
    title: "Shyam Ke Deewane",
    artist: "Hansraj Raghuwanshi",
    duration: "5:12",
    art: "https://images.unsplash.com/photo-1646765495885-8a61595cb9cf?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    url: "https://shyamsawariyaparivar.com/khatuSongs/Shyam%20Ke%20Deewane.mp3",
  },
  {
    id: "3",
    title: "Khatu Shyam Bhajan",
    artist: "Sambalpuri Star",
    duration: "3:45",
    art: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    url: "https://shyamsawariyaparivar.com/khatuSongs/Khatu%20Shyam%20Bhajan.mp3",
  },
];

export default function Bhajans() {
  const router = useRouter();
  const { t } = useLang();

  const CATEGORIES = [
    {
      id: "b",
      icon: "musical-notes",
      label: t.bhajans,
      sub: t.bhajanChipSub,
      route: null,
    },
    {
      id: "a",
      icon: "flame",
      label: t.aarti,
      sub: t.aartiChipSub,
      route: "/aarti",
    },
    {
      id: "c",
      icon: "book",
      label: t.chalisa,
      sub: t.chalisaChipSub,
      route: "/chalisa",
    },
    {
      id: "k",
      icon: "mic",
      label: "Kirtan",
      sub: t.kirtanChipSub,
      route: null,
    },
  ];
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [isPlaying]);

  const playTrack = async (track) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (current?.id === track.id && isPlaying) {
        setIsPlaying(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setCurrent(track);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.didJustFinish) setIsPlaying(false);
      });
    } catch (e) {
      // graceful fallback
      setCurrent(track);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current || !current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top"]}
    >
      <View style={s.header}>
        <Text style={s.title}>Devotion</Text>
        <Text style={s.sub}>{t.devotionHeaderSub}</Text>
      </View>

      <View style={s.catWrap}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={s.cat}
            onPress={() => c.route && router.push(c.route)}
            testID={`cat-${c.id}`}
          >
            <View style={s.catIcon}>
              <Ionicons name={c.icon} size={20} color={colors.primary} />
            </View>
            <Text style={s.catLabel}>{c.label}</Text>
            <Text style={s.catSub}>{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 8, marginBottom: 12 }}>
          <Text style={s.sectionLabel}>· Popular Bhajans ·</Text>
        </View>
        <FlatList
          data={TRACKS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: current ? 120 : 24,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }) => {
            const active = current?.id === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => playTrack(item)}
                style={[s.track, active && s.trackActive]}
                testID={`track-${item.id}`}
              >
                <Image source={{ uri: item.art }} style={s.trackArt} />
                <View style={{ flex: 1 }}>
                  <Text style={s.trackTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={s.trackArtist}>
                    {item.artist} · {item.duration}
                  </Text>
                </View>
                <View
                  style={[
                    s.playBtn,
                    active && { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name={active && isPlaying ? "pause" : "play"}
                    size={16}
                    color={active ? "#fff" : colors.secondary}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Mini Player */}
      {current && (
        <View style={s.miniPlayer} testID="mini-player">
          <LinearGradient
            colors={[colors.secondary, "#3D0D0C"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.Image
            source={{ uri: current.art }}
            style={[s.miniArt, { transform: [{ rotate: spin }] }]}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.miniTitle} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={s.miniArtist}>{current.artist}</Text>
          </View>
          <TouchableOpacity
            style={s.miniPlay}
            onPress={togglePlay}
            testID="mini-play-toggle"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.secondary,
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  catWrap: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 24,
  },
  cat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  catSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary },

  sectionLabel: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    textAlign: "center",
  },

  track: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.xl,
    gap: 14,
    ...shadow.soft,
  },
  trackActive: { borderWidth: 1, borderColor: colors.primary },
  trackArt: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
  },
  trackTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.secondary,
  },
  trackArtist: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.elevated,
  },

  miniPlayer: {
    position: "absolute",
    bottom: 78,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: radius.xxl,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 14,
    ...shadow.card,
  },
  miniArt: { width: 48, height: 48, borderRadius: 24 },
  miniTitle: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  miniArtist: {
    color: "#FFE9C0",
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  miniPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
