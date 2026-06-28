import { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { fonts, radius } from "../../../lib/theme";
import { useColors } from "../../../lib/ThemeContext";
import { operatorWalletApi } from "../../../lib/api";
import Toast from "../../../components/Toast";
import { useToast } from "../../../lib/hooks/useToast";

const fmtCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

function BankCard({ account, selected, onSelect }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface, borderRadius: 20, padding: 14,
        flexDirection: "row", alignItems: "center",
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.borderSubtle,
        backgroundColor: selected ? colors.primary + "10" : colors.surface,
        marginBottom: 8,
      }}
      onPress={() => onSelect(account._id)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: selected ? colors.primary + "20" : colors.elevated,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="business" size={18} color={selected ? colors.primary : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary }}>{account.bankName}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            {account.accountHolderName} · ****{account.accountNumber?.slice(-4)}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textDisabled }}>{account.ifscCode}</Text>
        </View>
      </View>
      <View style={{
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: selected ? colors.primary : colors.borderSubtle,
        alignItems: "center", justifyContent: "center",
      }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
      </View>
    </TouchableOpacity>
  );
}

export default function WithdrawScreen() {
  const router = useRouter();
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { toast, showToast, hideToast } = useToast();

  const [wallet, setWallet] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);

  const [bankForm, setBankForm] = useState({
    accountHolderName: "", accountNumber: "", confirmAccountNumber: "",
    ifscCode: "", bankName: "", accountType: "savings",
  });
  const [addingBank, setAddingBank] = useState(false);

  const load = useCallback(async () => {
    try {
      const [wRes, aRes] = await Promise.all([
        operatorWalletApi.get(),
        operatorWalletApi.bankAccounts(),
      ]);
      const w = wRes?.data || wRes;
      const acts = aRes?.data || [];
      setWallet(w);
      setAccounts(acts);
      const def = acts.find((a) => a.isDefault) || acts[0];
      if (def) setSelectedAccount(def._id);
    } catch (e) {
      showToast(e.message || "Failed to load", "error");
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const parsedAmt = parseInt(amount) || 0;
  const maxWithdraw = wallet?.balance || 0;
  const isValid = parsedAmt >= 100 && parsedAmt <= maxWithdraw && selectedAccount;

  const handleWithdraw = async () => {
    if (!isValid) {
      if (parsedAmt < 100) return showToast("Minimum withdrawal is ₹100", "error");
      if (parsedAmt > maxWithdraw) return showToast("Insufficient wallet balance", "error");
      if (!selectedAccount) return showToast("Select a bank account", "error");
      return;
    }
    setSubmitting(true);
    try {
      await operatorWalletApi.requestWithdrawal({ amount: parsedAmt, bankAccountId: selectedAccount });
      showToast("Withdrawal request submitted!", "success");
      setTimeout(() => router.replace("/admin/wallet/history"), 1200);
    } catch (e) {
      showToast(e.message || "Withdrawal failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBank = async () => {
    const { accountHolderName, accountNumber, confirmAccountNumber, ifscCode, bankName } = bankForm;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return showToast("All fields are required", "error");
    }
    if (accountNumber !== confirmAccountNumber) {
      return showToast("Account numbers don't match", "error");
    }
    setAddingBank(true);
    try {
      const res = await operatorWalletApi.addBankAccount({
        accountHolderName, accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        bankName, accountType: bankForm.accountType,
      });
      const newAct = res?.data || res;
      setAccounts((prev) => [...prev, newAct]);
      setSelectedAccount(newAct._id);
      setShowAddBank(false);
      setBankForm({ accountHolderName: "", accountNumber: "", confirmAccountNumber: "", ifscCode: "", bankName: "", accountType: "savings" });
      showToast("Bank account added", "success");
    } catch (e) {
      showToast(e.message || "Failed to add bank", "error");
    } finally {
      setAddingBank(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Withdraw Funds</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={s.balCard}>
          <Text style={s.balLabel}>Available Balance</Text>
          <Text style={s.balAmt}>{fmtCurrency(wallet?.balance)}</Text>
          {wallet?.pendingBalance > 0 && (
            <Text style={s.balPending}>{fmtCurrency(wallet?.pendingBalance)} pending settlement</Text>
          )}
        </View>

        {/* Amount input */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Withdrawal Amount</Text>
          <View style={s.amtRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={s.amtInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="Enter amount"
              placeholderTextColor={colors.textDisabled}
              maxLength={7}
            />
            <TouchableOpacity onPress={() => setAmount(String(maxWithdraw))} style={s.maxBtn}>
              <Text style={s.maxBtnTxt}>MAX</Text>
            </TouchableOpacity>
          </View>
          {parsedAmt > 0 && parsedAmt < 100 && (
            <Text style={s.amtError}>Minimum withdrawal is ₹100</Text>
          )}
          {parsedAmt > maxWithdraw && maxWithdraw > 0 && (
            <Text style={s.amtError}>Exceeds available balance</Text>
          )}
        </View>

        {/* Bank accounts */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Bank Account</Text>
            <TouchableOpacity onPress={() => setShowAddBank(!showAddBank)}>
              <Text style={s.addLink}>{showAddBank ? "Cancel" : "+ Add New"}</Text>
            </TouchableOpacity>
          </View>

          {accounts.map((acct) => (
            <BankCard
              key={acct._id}
              account={acct}
              selected={selectedAccount === acct._id}
              onSelect={setSelectedAccount}
            />
          ))}

          {accounts.length === 0 && !showAddBank && (
            <View style={s.noBankCard}>
              <Ionicons name="business-outline" size={32} color={colors.textDisabled} />
              <Text style={s.noBankTxt}>No bank accounts added yet</Text>
              <TouchableOpacity style={s.addBankBtn} onPress={() => setShowAddBank(true)}>
                <Text style={s.addBankBtnTxt}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add bank form */}
        {showAddBank && (
          <View style={s.addBankForm}>
            <Text style={s.sectionTitle}>New Bank Account</Text>

            {[
              { key: "accountHolderName", label: "Account Holder Name", placeholder: "As per bank records" },
              { key: "bankName", label: "Bank Name", placeholder: "e.g. State Bank of India" },
              { key: "accountNumber", label: "Account Number", placeholder: "Enter account number", keyboard: "number-pad" },
              { key: "confirmAccountNumber", label: "Confirm Account Number", placeholder: "Re-enter account number", keyboard: "number-pad" },
              { key: "ifscCode", label: "IFSC Code", placeholder: "e.g. SBIN0001234", autoCapitalize: "characters" },
            ].map(({ key, label, placeholder, keyboard, autoCapitalize }) => (
              <View key={key} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={bankForm[key]}
                  onChangeText={(v) => setBankForm((p) => ({ ...p, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType={keyboard || "default"}
                  autoCapitalize={autoCapitalize || "words"}
                />
              </View>
            ))}

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Account Type</Text>
              <View style={s.typeRow}>
                {["savings", "current"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[s.typeBtn, bankForm.accountType === type && s.typeBtnActive]}
                    onPress={() => setBankForm((p) => ({ ...p, accountType: type }))}
                  >
                    <Text style={[s.typeBtnTxt, bankForm.accountType === type && s.typeBtnTxtActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[s.addBankSubmit, addingBank && { opacity: 0.6 }]}
              onPress={handleAddBank}
              disabled={addingBank}
            >
              {addingBank
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.addBankSubmitTxt}>Save Bank Account</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Notice */}
        <View style={s.noticeCard}>
          <Ionicons name="information-circle" size={16} color="#2563EB" />
          <Text style={s.noticeTxt}>
            Withdrawals are processed within 2-3 business days after admin approval. Minimum withdrawal: ₹100.
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.withdrawBtn, (!isValid || submitting) && s.withdrawBtnDisabled]}
          onPress={handleWithdraw}
          disabled={!isValid || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                <Text style={s.withdrawBtnTxt}>
                  Request Withdrawal {parsedAmt > 0 ? `of ${fmtCurrency(parsedAmt)}` : ""}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  head: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    marginBottom: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  scroll: { paddingHorizontal: 16, paddingBottom: 110, gap: 20 },

  // Balance card
  balCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xxl, padding: 28,
    alignItems: "center", gap: 6,
  },
  balLabel: { color: "rgba(255,233,192,0.7)", fontFamily: fonts.accent, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  balAmt: { color: "#fff", fontFamily: fonts.heading, fontSize: 36 },
  balPending: { color: "rgba(255,233,192,0.6)", fontFamily: fonts.body, fontSize: 12 },

  // Sections
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  addLink: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },

  // Amount row
  amtRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, gap: 8, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  rupee: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.primary },
  amtInput: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textPrimary },
  maxBtn: {
    backgroundColor: colors.primary + "18",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  maxBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  amtError: { fontFamily: fonts.body, fontSize: 12, color: colors.error },

  // No bank state
  noBankCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 28,
    alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  noBankTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  addBankBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  addBankBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  // Add bank form
  addBankForm: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, gap: 14, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  fieldInput: {
    backgroundColor: colors.elevated, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1, padding: 10, borderRadius: 16,
    backgroundColor: colors.elevated, borderWidth: 1.5,
    borderColor: colors.borderSubtle, alignItems: "center",
  },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  typeBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  typeBtnTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  addBankSubmit: {
    backgroundColor: colors.primary, borderRadius: 999,
    padding: 14, alignItems: "center", marginTop: 4,
  },
  addBankSubmitTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

  // Notice
  noticeCard: {
    backgroundColor: colors.elevated, borderRadius: 20,
    padding: 14, flexDirection: "row", gap: 8, alignItems: "flex-start",
    borderWidth: 1, borderColor: "#2563EB30",
  },
  noticeTxt: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.borderSubtle,
  },
  withdrawBtn: {
    height: 54, borderRadius: 999, backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
});
