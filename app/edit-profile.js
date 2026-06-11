import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import Toast from '../components/Toast';
import { useToast } from '../lib/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { auth as authApi } from '../lib/api';

export default function EditProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState({ name: '', email: '', mobile: '', photoUrl: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    authApi.getProfile()
      .then((res) => {
        const u = res?.data || res;
        if (u) setProfile({
          name: u.name || '',
          email: u.email || '',
          mobile: u.mobile || u.phone || '',
          photoUrl: u.photoUrl || '',
        });
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const { toast, showToast, hideToast } = useToast();
  const setPw = (k, v) => setPwForm((f) => ({ ...f, [k]: v }));
  const setP = (k, v) => setProfile((f) => ({ ...f, [k]: v }));

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const localUri = result.assets[0].uri;
    setLoadingPhoto(true);
    try {
      const res = await authApi.uploadProfilePicture(localUri);
      const newUrl = res?.photoUrl || res?.data?.photoUrl;
      if (newUrl) {
        setP('photoUrl', newUrl);
        const cached = await authApi.getUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...cached, photoUrl: newUrl }));
        showToast('Profile photo updated.', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Could not upload photo.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.name) { showToast('Name cannot be empty.'); return; }
    setLoadingProfile(true);
    try {
      const res = await authApi.updateProfile({ name: profile.name, email: profile.email, phone: profile.mobile });
      const updated = res?.data || res?.user || res;
      if (updated) {
        const cached = await authApi.getUser();
        await AsyncStorage.setItem('user', JSON.stringify({ ...cached, ...updated }));
      }
      showToast('Profile updated successfully.', 'success');
    } catch (e) {
      showToast(e.message || 'Could not update profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      showToast('Current and new password are required.'); return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      showToast('New password and confirm password do not match.'); return;
    }
    if (pwForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters.'); return;
    }
    setLoadingPw(true);
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      showToast('Password updated successfully.', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      showToast(e.message || 'Could not change password.');
    } finally {
      setLoadingPw(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="edit-profile-back">
            <Ionicons name="arrow-back" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={s.title}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Photo section */}
          <View style={s.photoSection}>
            <TouchableOpacity style={s.photoWrap} onPress={pickPhoto} disabled={loadingPhoto} testID="pick-photo-btn">
              {loadingPhoto ? (
                <View style={s.photoPlaceholder}><ActivityIndicator color={colors.primary} /></View>
              ) : profile.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={s.photoImg} />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Text style={s.photoInitial}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={s.photoBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
            </TouchableOpacity>
            <Text style={s.photoHint}>Tap to change profile photo</Text>
          </View>

          {/* Profile info */}
          <Text style={s.sectionLabel}>· Personal Info ·</Text>
          {[
            { k: 'name', label: 'Full Name *', icon: 'person-outline' },
            { k: 'email', label: 'Email (optional)', icon: 'mail-outline', kb: 'email-address' },
            { k: 'mobile', label: 'Mobile (optional)', icon: 'call-outline', kb: 'phone-pad' },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name={f.icon} size={18} color={colors.textSecondary} />
                <TextInput
                  testID={`ep-${f.k}`}
                  style={s.input}
                  placeholder={f.label.replace(' *', '')}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType={f.kb || 'default'}
                  value={profile[f.k]}
                  onChangeText={(v) => setP(f.k, v)}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.cta} onPress={saveProfile} disabled={loadingProfile} testID="save-profile-btn">
            {loadingProfile ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={s.ctaText}>Save Profile</Text></>
            )}
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Change password */}
          <Text style={s.sectionLabel}>· Change Password ·</Text>
          {[
            { k: 'currentPassword', label: 'Current Password', showK: 'current' },
            { k: 'newPassword', label: 'New Password', showK: 'new' },
            { k: 'confirm', label: 'Confirm New Password', showK: 'confirm' },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  testID={`ep-${f.k}`}
                  style={s.input}
                  placeholder={f.label}
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showPw[f.showK]}
                  value={pwForm[f.k]}
                  onChangeText={(v) => setPw(f.k, v)}
                />
                <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, [f.showK]: !p[f.showK] }))}>
                  <Ionicons name={showPw[f.showK] ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.cta, { backgroundColor: colors.secondary }]} onPress={changePassword} disabled={loadingPw} testID="change-pw-btn">
            {loadingPw ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={s.ctaText}>Change Password</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.secondary },

  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoWrap: { position: 'relative', marginBottom: 8 },
  photoImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.primary },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  photoInitial: { fontFamily: fonts.heading, fontSize: 42, color: colors.primary },
  photoBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  photoHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  sectionLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 14 },
  field: { marginBottom: 14 },
  fieldLabel: { fontFamily: fonts.accent, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 54, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, height: 54 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, marginTop: 4, ...shadow.card },
  ctaText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: 28 },
});
