import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const { width } = Dimensions.get("window");
const STEP = 3;
const TOTAL = 10;

const SLIDES = [
  {
    id: 1,
    icon: "bus",
    gradient: ["#D95D39", "#B94929"],
    bg: "#FEE9E3",
    title: "Discover Sacred Tours",
    subtitle:
      "Find hundreds of pilgrimage tours across India. AC & Non-AC buses, trusted operators, and easy seat booking — all in one app.",
    accent: "#D95D39",
  },
  {
    id: 2,
    icon: "navigate",
    gradient: ["#2563EB", "#1D4ED8"],
    bg: "#EFF6FF",
    title: "Live Bus Tracking",
    subtitle:
      "Track your bus in real-time. Know exactly when your bus will arrive and share your live location with family.",
    accent: "#2563EB",
  },
  {
    id: 3,
    icon: "shield-checkmark",
    gradient: ["#16A34A", "#15803D"],
    bg: "#F0FDF4",
    title: "Secure Travel Experience",
    subtitle:
      "Verified operators, digital tickets, SOS alerts, and emergency contacts. Your safety is our top priority.",
    accent: "#16A34A",
  },
  {
    id: 4,
    icon: "wallet",
    gradient: ["#7C3AED", "#6D28D9"],
    bg: "#F5F3FF",
    title: "Wallet, Rewards & Cashback",
    subtitle:
      "Earn loyalty points on every booking. Get cashback, exclusive offers, and use your wallet for seamless payments.",
    accent: "#7C3AED",
  },
];

function StepBar({ step, total }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < step ? colors.primary : colors.borderSubtle,
          }}
        />
      ))}
    </View>
  );
}

export default function CarouselScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef(null);

  const goToSlide = (idx) => {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setCurrent(idx);
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      goToSlide(current + 1);
    } else {
      router.push("/onboarding/location");
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/location");
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrent(idx);
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((sl) => (
          <View key={sl.id} style={[s.slide, { width }]}>
            {/* Icon card */}
            <View style={[s.illustrationWrap, { backgroundColor: sl.bg }]}>
              <LinearGradient colors={sl.gradient} style={s.iconGradient}>
                <Ionicons name={sl.icon} size={72} color="#fff" />
              </LinearGradient>
              {/* decorative dots */}
              <View style={[s.dot1, { backgroundColor: sl.accent + "20" }]} />
              <View style={[s.dot2, { backgroundColor: sl.accent + "15" }]} />
            </View>

            <View style={s.textWrap}>
              <Text style={s.slideTitle}>{sl.title}</Text>
              <Text style={s.slideSub}>{sl.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View style={[s.dot, i === current && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>{isLast ? "Get Started" : "Next"}</Text>
          <Ionicons
            name={isLast ? "checkmark" : "arrow-forward"}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  slide: { alignItems: "center", paddingHorizontal: 24 },
  illustrationWrap: {
    width: width - 48,
    height: 260,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    overflow: "hidden",
    position: "relative",
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  dot1: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 20,
    right: 20,
  },
  dot2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    left: -20,
  },
  textWrap: { alignItems: "center" },
  slideTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  slideSub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderSubtle,
  },
  dotActive: { width: 24, backgroundColor: colors.primary },
  bottom: { padding: 20, paddingBottom: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    ...shadow.card,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
