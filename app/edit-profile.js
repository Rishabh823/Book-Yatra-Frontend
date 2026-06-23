import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, DeviceEventEmitter,
} from 'react-native';
import Toast from '../components/Toast';
import { useToast } from '../lib/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../lib/theme';
import { auth as authApi } from '../lib/api';

const PRIMARY = '#D95D39';

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
    if (status !== 'granted') { showToast('Please allow access to your photo library.'); return; }
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
        DeviceEventEmitter.emit('userPhotoChanged', newUrl);
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
    if (!pwForm.currentPassword || !pwForm.newPassword) { showToast('Current and new password are required.'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { showToast('New password and confirm password do not match.'); return; }
    if (pwForm.newPassword.length < 6) { showToast('Password must be at least 6 characters.'); return; }
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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </SafeAreaView>
    );
  }

  const initials = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="edit-profile-back">
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} disabled={loadingPhoto} testID="pick-photo-btn">
              {loadingPhoto ? (
                <View style={s.avatarCircle}><ActivityIndicator color={PRIMARY} /></View>
              ) : profile.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarCircle}>
                  <Text style={s.avatarInitial}>{initials}</Text>
                </View>
              )}
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={s.avatarHint}>Tap to change profile photo</Text>
          </View>

          {/* Personal Info */}
          <Text style={s.sectionLabel}>PERSONAL INFO</Text>

          {[
            { k: 'name', label: 'Full name', req: true, icon: 'person-outline', kb: 'default' },
            { k: 'email', label: 'Email', opt: true, icon: 'mail-outline', kb: 'email-address' },
            { k: 'mobile', label: 'Mobile', opt: true, icon: 'call-outline', kb: 'phone-pad' },
          ].map((f) => (
            <View key={f.k} style={s.fieldWrap}>
              <Text style={s.fieldLabel}>
                {f.label}{f.req ? ' *' : ''}{f.opt ? ' (optional)' : ''}
              </Text>
              <View style={s.inputRow}>
                <Ionicons name={f.icon} size={18} color="#9CA3AF" />
                <TextInput
                  testID={`ep-${f.k}`}
                  style={s.input}
                  placeholder={f.label}
                  placeholderTextColor="#C0C0C0"
                  keyboardType={f.kb}
                  value={profile[f.k]}
                  onChangeText={(v) => setP(f.k, v)}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.saveBtnOrange} onPress={saveProfile} disabled={loadingProfile} testID="save-profile-btn">
            {loadingProfile ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.saveBtnTxt}>Save profile</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider} />

          {/* Change Password */}
          <Text style={s.sectionLabel}>CHANGE PASSWORD</Text>

          {[
            { k: 'currentPassword', label: 'Current password', showK: 'current' },
            { k: 'newPassword', label: 'New password', showK: 'new' },
            { k: 'confirm', label: 'Confirm new password', showK: 'confirm' },
          ].map((f) => (
            <View key={f.k} style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                <TextInput
                  testID={`ep-${f.k}`}
                  style={s.input}
                  placeholder={f.label.charAt(0).toUpperCase() + f.label.slice(1)}
                  placeholderTextColor="#C0C0C0"
                  secureTextEntry={!showPw[f.showK]}
                  value={pwForm[f.k]}
                  onChangeText={(v) => setPw(f.k, v)}
                />
                <TouchableOpacity onPress={() => setShowPw((p) => ({ ...p, [f.showK]: !p[f.showK] }))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPw[f.showK] ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.saveBtnOutlined} onPress={changePassword} disabled={loadingPw} testID="change-pw-btn">
            {loadingPw ? <ActivityIndicator color="#374151" /> : (
              <>
                <Ionicons name="lock-closed" size={16} color="#374151" />
                <Text style={s.saveBtnOutlinedTxt}>Change password</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: '#111827',
  },

  avatarSection: {
    alignItems: 'center',
    paddingTop: 28,
    marginBottom: 28,
  },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#D6E4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: '#2563EB',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#9CA3AF',
  },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F2F0ED',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#111827',
    height: 52,
  },

  saveBtnOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 52,
    marginTop: 8,
  },
  saveBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 28,
  },

  saveBtnOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBtnOutlinedTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#111827',
  },
});
