import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, shadow } from '../../lib/theme';
import { auth as authApi } from '../../lib/api';
import Toast from '../../components/Toast';
import { useToast } from '../../lib/hooks/useToast';

export default function AdminPortalLogin() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      showToast('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await authApi.loginSuperAdmin(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e) {
      showToast(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <View style={s.wrap}>
          {/* Shield icon */}
          <View style={s.iconWrap}>
            <Ionicons name="shield-checkmark" size={36} color="#FFD700" />
          </View>

          <Text style={s.title}>Admin Portal</Text>
          <Text style={s.sub}>Restricted access — authorised personnel only</Text>

          <View style={s.card}>
            {/* Email */}
            <View style={s.field}>
              <Text style={s.label}>Email Address</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={17} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={s.input}
                  placeholder="admin@bookyatra.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  testID="sadmin-email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={17} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPwd}
                  value={password}
                  onChangeText={setPassword}
                  testID="sadmin-password"
                />
                <TouchableOpacity onPress={() => setShowPwd(v => !v)}>
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={17} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={s.cta} onPress={onLogin} disabled={loading} testID="sadmin-login-btn">
              {loading ? <ActivityIndicator color="#000" /> : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color="#000" />
                  <Text style={s.ctaText}>Access Portal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.notice}>
            This portal is monitored. Unauthorised access attempts are logged.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  back:      { position: 'absolute', top: 16, left: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  wrap:      { paddingHorizontal: 28, alignItems: 'center' },
  iconWrap:  { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { fontFamily: fonts.heading, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  sub:       { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center' },
  card:      { width: '100%', marginTop: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xxl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 24 },
  field:     { marginBottom: 18 },
  label:     { fontFamily: fonts.accent, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 52, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input:     { flex: 1, fontFamily: fonts.body, fontSize: 14, color: '#fff', height: 52 },
  cta:       { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFD700', height: 52, borderRadius: radius.pill },
  ctaText:   { fontFamily: fonts.bodyBold, fontSize: 15, color: '#000' },
  notice:    { marginTop: 28, fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 16 },
});
