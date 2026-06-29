import { useState, useEffect, useMemo } from 'react';
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
import { fonts } from '../lib/theme';
import { useColors } from '../lib/ThemeContext';
import { auth as authApi } from '../lib/api';

const PRIMARY = '#D95D39';

export default function EditProfile() {
  const router = useRouter();
  const colors = useColors();
  const [profile, setProfile] = useState({ name: '', email: '', mobile: '', photoUrl: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [fetching, setFetching] = useState(true);

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

  const s = useMemo(() => makeStyles(colors), [colors]);

  if (fetching) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </SafeAreaView>
    );
  }

  const initials = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="edit-profile-back">
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
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
                <Ionicons name={f.icon} size={18} color={colors.textDisabled} />
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

        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.textPrimary,
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
    borderColor: colors.surface,
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDisabled,
  },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textDisabled,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.borderSubtle,
    marginVertical: 28,
  },

  saveBtnOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  saveBtnOutlinedTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
