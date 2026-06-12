import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { auth as authApi } from '../lib/api';
import Toast from '../components/Toast';
import { useToast } from '../lib/hooks/useToast';

export default function SelectOperators() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [operators, setOperators] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialSelection, setInitialSelection] = useState(new Set());

  useEffect(() => {
    const init = async () => {
      try {
        // Load currently joined operators first so we can pre-select them
        let joined = [];
        try {
          const res = await authApi.getProfile();
          const profile = res?.data || res?.user || res;
          if (Array.isArray(profile?.joinedOperators) && profile.joinedOperators.length > 0) {
            joined = profile.joinedOperators;
          }
        } catch {}
        if (joined.length === 0) {
          const stored = await AsyncStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            if (Array.isArray(u.joinedOperators)) joined = u.joinedOperators;
          }
        }
        const joinedIds = new Set(
          joined.map(op => typeof op === 'object' ? String(op._id) : String(op))
        );
        setSelected(joinedIds);
        setInitialSelection(joinedIds);

        const ops = await authApi.getPublicOperators();
        setOperators(ops);
      } catch (e) {
        showToast(e.message || 'Could not load operators');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(operators.map((o) => o._id)));
  const clearAll = () => setSelected(new Set());

  const hasChanges = () => {
    if (selected.size !== initialSelection.size) return true;
    for (const id of selected) { if (!initialSelection.has(id)) return true; }
    return false;
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const selectedIds = Array.from(selected);
      await authApi.joinOperators(selectedIds);
      // Persist selected operator objects so tours tab can read them immediately
      const selectedOperators = operators.filter(op => selected.has(op._id));
      const stored = await AsyncStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : {};
      user.joinedOperators = selectedOperators;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      showToast(selectedIds.length === 0 ? 'All operators removed.' : 'Operators saved!', 'success');
      setTimeout(() => router.replace('/(tabs)'), 800);
    } catch (e) {
      showToast(e.message || 'Failed to save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isFirstTime = initialSelection.size === 0;
  const onSkip = () => router.replace('/(tabs)');

  const renderOperator = ({ item }) => {
    const isSelected = selected.has(item._id);
    return (
      <TouchableOpacity
        style={[s.card, isSelected && s.cardSelected]}
        onPress={() => toggle(item._id)}
        activeOpacity={0.8}
        testID={`operator-${item._id}`}
      >
        <View style={s.cardLeft}>
          {item.photoUrl
            ? <Image source={{ uri: item.photoUrl }} style={s.avatar} />
            : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Ionicons name="bus" size={22} color={isSelected ? colors.primary : colors.textSecondary} />
              </View>
            )
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardName, isSelected && s.cardNameSelected]}>
            {item.businessName || item.name}
          </Text>
          {item.businessName && item.name !== item.businessName && (
            <Text style={s.cardSub}>{item.name}</Text>
          )}
          <Text style={s.tourCount}>
            {item.tourCount} {item.tourCount === 1 ? 'tour' : 'tours'} available
          </Text>
        </View>
        <View style={[s.check, isSelected && s.checkSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient colors={[colors.secondary, '#3D0D0C']} style={s.hero}>
        <Text style={s.om}>ॐ</Text>
        <Text style={s.title}>Choose Your Operators</Text>
        <Text style={s.sub}>Select the tour operators you want to follow</Text>
      </LinearGradient>

      {/* Selection controls */}
      <View style={s.controls}>
        <Text style={s.selCount}>
          {selected.size} of {operators.length} selected
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={s.controlLink}>Select All</Text>
          </TouchableOpacity>
          {selected.size > 0 && (
            <TouchableOpacity onPress={clearAll}>
              <Text style={[s.controlLink, { color: colors.textSecondary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : operators.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="bus-outline" size={56} color={colors.textDisabled} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
            No operators available yet
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDisabled, marginTop: 6, textAlign: 'center' }}>
            Check back later — new operators are added regularly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={operators}
          keyExtractor={(item) => item._id}
          renderItem={renderOperator}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Bottom actions */}
      <View style={s.footer}>
        <TouchableOpacity style={s.skipBtn} onPress={onSkip} testID="skip-btn">
          <Text style={s.skipText}>{isFirstTime ? 'Skip for now' : 'Cancel'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.cta, (!hasChanges() && !isFirstTime) && s.ctaDisabled]}
          onPress={onSave}
          disabled={saving || (isFirstTime && selected.size === 0)}
          testID="continue-btn"
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.ctaText}>{isFirstTime ? 'Continue' : 'Save Changes'}</Text>
              <Ionicons name={isFirstTime ? 'arrow-forward' : 'checkmark'} size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero:            { paddingTop: 40, paddingBottom: 28, alignItems: 'center', borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl },
  om:              { color: '#FFE9C0', fontSize: 40, fontFamily: fonts.heading },
  title:           { color: '#fff', fontFamily: fonts.heading, fontSize: 22, marginTop: 4 },
  sub:             { color: '#FFE9C0', fontFamily: fonts.body, fontSize: 12, marginTop: 4 },

  controls:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  selCount:        { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  controlLink:     { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  card:            { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.borderSubtle, ...shadow.soft },
  cardSelected:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  cardLeft:        { },
  avatar:          { width: 52, height: 52, borderRadius: radius.lg },
  avatarFallback:  { backgroundColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  cardName:        { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 2 },
  cardNameSelected:{ color: colors.primary },
  cardSub:         { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  tourCount:       { fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled },

  check:           { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  checkSelected:   { backgroundColor: colors.primary, borderColor: colors.primary },

  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.borderSubtle },
  skipBtn:         { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle },
  skipText:        { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  cta:             { flex: 2, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, ...shadow.card },
  ctaDisabled:     { backgroundColor: colors.textDisabled },
  ctaText:         { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
});
