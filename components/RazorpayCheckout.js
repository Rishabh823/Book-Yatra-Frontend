// Reusable cross-platform Razorpay checkout component (modal).
// Usage:
//   <RazorpayCheckout
//     visible={true}
//     options={{ key, orderId, amount, currency, name, description, prefill }}
//     onSuccess={({ paymentId, orderId, signature }) => {...}}
//     onClose={() => setVisible(false)}
//   />
//
import { useEffect } from "react";
import {
  Modal,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import WebView from "react-native-webview";
import { buildCheckoutHtml, openRazorpayWeb, isWeb } from "../lib/razorpay";
import { colors } from "../lib/theme";

export default function RazorpayCheckout({
  visible,
  options,
  onSuccess,
  onClose,
}) {
  // On web, trigger checkout immediately when visible toggles on.
  useEffect(() => {
    let cancelled = false;
    if (!visible || !isWeb || !options) return;
    (async () => {
      try {
        const res = await openRazorpayWeb(options);
        if (!cancelled) onSuccess?.(res);
      } catch (e) {
        if (!cancelled) onClose?.(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, isWeb, options]);

  if (!visible) return null;
  if (isWeb) {
    // Web uses overlay automatically; render a transparent placeholder.
    return null;
  }

  const html = buildCheckoutHtml(options || {});
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      testID="razorpay-modal"
    >
      <View style={styles.container}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data || "{}");
              if (msg.type === "success")
                onSuccess?.({
                  paymentId: msg.paymentId,
                  orderId: msg.orderId,
                  signature: msg.signature,
                });
              else if (msg.type === "cancel" || msg.type === "error")
                onClose?.(msg.message ? new Error(msg.message) : null);
            } catch {}
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
