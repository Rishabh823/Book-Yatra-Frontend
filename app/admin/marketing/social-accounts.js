import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminShell } from '../../../lib/AdminScreen';
import { useColors } from '../../../lib/ThemeContext';
import { fonts, radius } from '../../../lib/theme';
import { marketing as mktApi } from '../../../lib/api';

const ALL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: 'logo-instagram' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'logo-facebook' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: 'logo-whatsapp' },
  { key: 'telegram', label: 'Telegram', color: '#0088CC', icon: 'paper-plane-outline' },
  { key: 'twitter', label: 'Twitter', color: '#1DA1F2', icon: 'logo-twitter' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'logo-linkedin' },
  { key: 'google_business', label: 'Google Business', color: '#4285F4', icon: 'logo-google' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000', icon: 'logo-youtube' },
];

export default function SocialAccounts() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telegramModal, setTelegramModal] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null); // account object
  const [confirmDelete, setConfirmDelete] = useState(null);         // account object

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await mktApi.getSocialAccounts();
      const data = Array.isArray(res) ? res : res?.data || res?.accounts || [];
      setAccounts(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load social accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const connectedKeys = useMemo(
    () => new Set(accounts.filter((a) => a.connected).map((a) => a.platform)),
    [accounts],
  );

  const connectedAccounts = accounts.filter((a) => a.connected);
  const availablePlatforms = ALL_PLATFORMS.filter((p) => !connectedKeys.has(p.key));

  const handleConnect = (platform) => {
    if (platform.key === 'telegram') {
      setBotToken('');
      setChannelId('');
      setAccountName('');
      setTelegramModal(true);
      return;
    }
    Alert.alert(
      `Connect ${platform.label}`,
      `To connect ${platform.label}, you need:\n1. A ${platform.label} Business account\n2. API credentials from ${platform.label} Developer Portal\n\nContact your developer to set up OAuth.`,
      [{ text: 'OK' }],
    );
  };

  const handleSaveTelegram = async () => {
    if (!botToken.trim() || !channelId.trim() || !accountName.trim()) return;
    setSaving(true);
    try {
      const res = await mktApi.connectSocialAccount({
        platform: 'telegram',
        botToken: botToken.trim(),
        channelId: channelId.trim(),
        accountName: accountName.trim(),
        accountId: channelId.trim(),
        connected: true,
      });
      setTelegramModal(false);
      // Refresh from server to get correct _id
      await fetchAccounts();
    } catch (e) {
      console.warn('Telegram connect error', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!confirmDisconnect) return;
    setDisconnecting(true);
    try {
      await mktApi.disconnectAccount(confirmDisconnect._id || confirmDisconnect.id);
      setAccounts((prev) =>
        prev.map((a) =>
          (a._id || a.id) === (confirmDisconnect._id || confirmDisconnect.id)
            ? { ...a, connected: false }
            : a,
        ),
      );
      setConfirmDisconnect(null);
    } catch (e) {
      console.warn('Disconnect error', e?.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await mktApi.deleteSocialAccount(confirmDelete._id || confirmDelete.id);
      setAccounts((prev) =>
        prev.filter((a) => (a._id || a.id) !== (confirmDelete._id || confirmDelete.id)),
      );
      setConfirmDelete(null);
    } catch (e) {
      console.warn('Delete error', e?.message);
    } finally {
      setDeleting(false);
    }
  };

  const getPlatformMeta = (platformKey) =>
    ALL_PLATFORMS.find((p) => p.key === platformKey) || {
      key: platformKey,
      label: platformKey,
      color: '#6B7280',
      icon: 'globe-outline',
    };

  return (
    <AdminShell title="Social Accounts" subtitle="Manage connected platforms">
      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Connected Accounts */}
          <Text style={s.sectionTitle}>Connected Accounts</Text>
          {connectedAccounts.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="link-outline" size={32} color={colors.textSecondary} />
              <Text style={s.emptyText}>No accounts connected</Text>
              <Text style={s.emptyHint}>Connect a platform below to start posting</Text>
            </View>
          ) : (
            connectedAccounts.map((acct) => {
              const meta = getPlatformMeta(acct.platform);
              return (
                <View key={acct.id} style={s.accountCard}>
                  <View style={[s.platformIconWrap, { backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.icon} size={24} color={meta.color} />
                  </View>
                  <View style={s.accountInfo}>
                    <Text style={s.accountName}>{acct.accountName || meta.label}</Text>
                    <Text style={s.accountPlatform}>{meta.label}</Text>
                  </View>
                  <View style={s.connectedBadge}>
                    <View style={s.greenDot} />
                    <Text style={s.connectedText}>Connected</Text>
                  </View>
                  <View style={s.accountActions}>
                    <TouchableOpacity
                      style={s.disconnectBtn}
                      onPress={() => setConfirmDisconnect(acct)}
                    >
                      <Text style={s.disconnectText}>Disconnect</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => setConfirmDelete(acct)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Available Platforms */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Available Platforms</Text>
          {availablePlatforms.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
              <Text style={s.emptyText}>All platforms connected!</Text>
            </View>
          ) : (
            availablePlatforms.map((platform) => (
              <View key={platform.key} style={s.platformCard}>
                <View style={[s.platformIconWrap, { backgroundColor: platform.color + '22' }]}>
                  <Ionicons name={platform.icon} size={24} color={platform.color} />
                </View>
                <View style={s.platformInfo}>
                  <Text style={s.platformName}>{platform.label}</Text>
                  <Text style={s.platformHint}>
                    {platform.key === 'telegram' ? 'Connect via Bot Token' : 'Requires OAuth setup'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.connectBtn, { borderColor: platform.color }]}
                  onPress={() => handleConnect(platform)}
                >
                  <Text style={[s.connectBtnText, { color: platform.color }]}>Connect</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={s.bottomSpacer} />
        </ScrollView>
      )}

      {/* Disconnect Confirm Modal */}
      <Modal visible={!!confirmDisconnect} animationType="fade" transparent onRequestClose={() => setConfirmDisconnect(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setConfirmDisconnect(null)}>
          <Pressable style={s.confirmSheet} onPress={() => {}}>
            <View style={[s.confirmIconBox, { backgroundColor: '#D9770622' }]}>
              <Ionicons name="unlink-outline" size={28} color="#D97706" />
            </View>
            <Text style={s.confirmTitle}>Disconnect Account?</Text>
            <Text style={s.confirmBody}>
              "{confirmDisconnect?.accountName || confirmDisconnect?.platform}" will be disconnected. Posts to this platform will stop.
            </Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmDisconnect(null)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmActionBtn, { backgroundColor: '#D97706' }, disconnecting && { opacity: 0.6 }]}
                onPress={handleDisconnectConfirm}
                disabled={disconnecting}
              >
                {disconnecting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="unlink-outline" size={15} color="#fff" />}
                <Text style={s.confirmActionText}>{disconnecting ? 'Disconnecting…' : 'Disconnect'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={!!confirmDelete} animationType="fade" transparent onRequestClose={() => setConfirmDelete(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setConfirmDelete(null)}>
          <Pressable style={s.confirmSheet} onPress={() => {}}>
            <View style={[s.confirmIconBox, { backgroundColor: '#DC262615' }]}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={s.confirmTitle}>Delete Account?</Text>
            <Text style={s.confirmBody}>
              "{confirmDelete?.accountName || confirmDelete?.platform}" will be permanently deleted. This cannot be undone.
            </Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmDelete(null)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmActionBtn, { backgroundColor: '#DC2626' }, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="trash-outline" size={15} color="#fff" />}
                <Text style={s.confirmActionText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Telegram Connect Modal */}
      <Modal
        visible={telegramModal}
        animationType="slide"
        transparent
        onRequestClose={() => setTelegramModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setTelegramModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.kvWrap}
          >
            <Pressable style={s.modalSheet} onPress={() => {}}>
              {/* Handle */}
              <View style={s.modalHandle} />

              <Text style={s.modalTitle}>Connect Telegram</Text>

              {/* Step guide */}
              <View style={s.stepsBox}>
                <Text style={s.stepsTitle}>Setup Steps:</Text>
                <Text style={s.stepsText}>1. Open Telegram → search <Text style={s.stepsBold}>@BotFather</Text></Text>
                <Text style={s.stepsText}>2. Send <Text style={s.stepsBold}>/newbot</Text> → get your Bot Token</Text>
                <Text style={s.stepsText}>3. Add the bot to your <Text style={s.stepsBold}>Channel as Admin</Text></Text>
                <Text style={s.stepsText}>4. Copy the <Text style={s.stepsBold}>Channel username</Text> (e.g. @tripkartyatra)</Text>
              </View>

              <Text style={s.inputLabel}>Bot Token</Text>
              <TextInput
                style={s.input}
                placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.textSecondary}
                value={botToken}
                onChangeText={setBotToken}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.inputLabel}>Channel Username</Text>
              <TextInput
                style={s.input}
                placeholder="@tripkartyatra  (must start with @)"
                placeholderTextColor={colors.textSecondary}
                value={channelId}
                onChangeText={(v) => setChannelId(v.startsWith('@') || v === '' ? v : '@' + v)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={s.inputHint}>⚠️ This must be the PUBLIC channel username, NOT the bot username</Text>

              <Text style={s.inputLabel}>Account Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Shyam Sawariya Yatra"
                placeholderTextColor={colors.textSecondary}
                value={accountName}
                onChangeText={setAccountName}
              />

              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSaveTelegram}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Save & Connect</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={() => setTelegramModal(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    sectionTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: 10,
    },
    // Connected account card
    accountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 10,
    },
    platformIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    accountPlatform: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    connectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#16A34A22',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#16A34A',
    },
    connectedText: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: '#16A34A',
    },
    accountActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    disconnectBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      minWidth: 80,
      alignItems: 'center',
    },
    disconnectText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: '#DC262611',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Available platform card
    platformCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 12,
    },
    platformInfo: {
      flex: 1,
    },
    platformName: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    platformHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    connectBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.sm,
      borderWidth: 1.5,
    },
    connectBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
    },
    // Empty
    emptyCard: {
      backgroundColor: colors.elevated,
      borderRadius: radius.md,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 8,
      marginBottom: 10,
    },
    emptyText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    emptyHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    kvWrap: {
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderSubtle,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    modalSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 20,
    },
    inputLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 14,
    },
    saveBtn: {
      backgroundColor: '#0088CC',
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 10,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: '#fff',
    },
    cancelBtn: { paddingVertical: 10, alignItems: 'center' },
    cancelBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },

    stepsBox: {
      backgroundColor: '#EFF6FF', borderRadius: radius.sm, borderWidth: 1,
      borderColor: '#BFDBFE', padding: 12, marginBottom: 16, gap: 4,
    },
    stepsTitle: { fontFamily: fonts.semiBold, fontSize: 12, color: '#1D4ED8', marginBottom: 4 },
    stepsText: { fontFamily: fonts.regular, fontSize: 12, color: '#1E40AF', lineHeight: 18 },
    stepsBold: { fontFamily: fonts.semiBold, color: '#1E3A8A' },
    inputHint: { fontFamily: fonts.regular, fontSize: 11, color: '#DC2626', marginTop: -10, marginBottom: 14 },
    bottomSpacer: { height: 32 },

    // Confirm modals
    confirmSheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 28, paddingBottom: 40, alignItems: 'center',
    },
    confirmIconBox: {
      width: 64, height: 64, borderRadius: 32,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    confirmTitle: {
      fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary,
      marginBottom: 8, textAlign: 'center',
    },
    confirmBody: {
      fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary,
      textAlign: 'center', lineHeight: 20, marginBottom: 24,
    },
    confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
    confirmCancelBtn: {
      flex: 1, paddingVertical: 13, alignItems: 'center',
      borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    confirmCancelText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
    confirmActionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 13, borderRadius: radius.pill,
    },
    confirmActionText: { fontFamily: fonts.semiBold, fontSize: 14, color: '#fff' },
  });
}
