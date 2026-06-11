// Cross-platform Razorpay checkout helper.
// - On Web: dynamically loads checkout.js and opens Razorpay overlay.
// - On Native (Expo Go / Dev Client): opens a small in-app HTML page in
//   `react-native-webview` that loads Razorpay's standard checkout and
//   posts the success / failure event back via `window.ReactNativeWebView`.
//
// Backend contract:
//   The caller has already created an order on the server and is passing
//   `{ key, orderId, amount, currency, prefill }` here.
//
// Returns: Promise<{ paymentId, orderId, signature }>
//
import { Platform } from "react-native";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadScriptOnce() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Razorpay) return resolve(window.Razorpay);
    const existing = document.getElementById("razorpay-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () =>
        reject(new Error("Razorpay SDK failed to load")),
      );
      return;
    }
    const s = document.createElement("script");
    s.id = "razorpay-sdk";
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(s);
  });
}

export function buildCheckoutHtml({
  key,
  orderId,
  amount,
  currency,
  name,
  description,
  prefill,
}) {
  const safePrefill = JSON.stringify(prefill || {});
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Pay</title>
  <style>html,body{margin:0;background:#FFFAF0;font-family:-apple-system,BlinkMacSystemFont,Manrope,sans-serif;color:#5C1615;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{padding:32px;text-align:center}.spin{width:36px;height:36px;border:3px solid #FDECE7;border-top-color:#D95D39;border-radius:50%;animation:r 1s linear infinite;margin:0 auto 16px}@keyframes r{to{transform:rotate(360deg)}}</style>
  </head><body><div class="box"><div class="spin"></div><div>Opening secure payment…</div></div>
  <script src="${SCRIPT_SRC}"></script>
  <script>
  (function(){
    function post(msg){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch(e){} }
    var opts = {
      key: ${JSON.stringify(key)},
      order_id: ${JSON.stringify(orderId)},
      amount: ${JSON.stringify(amount)},
      currency: ${JSON.stringify(currency || "INR")},
      name: ${JSON.stringify(name || "Book Yatra")},
      description: ${JSON.stringify(description || "Payment")},
      prefill: ${safePrefill},
      theme: { color: '#D95D39' },
      modal: { ondismiss: function(){ post({ type: 'cancel' }); } },
      handler: function(resp){
        post({ type: 'success', paymentId: resp.razorpay_payment_id, orderId: resp.razorpay_order_id, signature: resp.razorpay_signature });
      }
    };
    function open(){ try { var r = new Razorpay(opts); r.on('payment.failed', function(r){ post({ type:'error', message: (r && r.error && r.error.description) || 'Payment failed' }); }); r.open(); } catch(e){ post({ type:'error', message: String(e) }); } }
    if (window.Razorpay) open(); else { window.addEventListener('load', open); }
  })();
  </script></body></html>`;
}

export async function openRazorpayWeb({
  key,
  orderId,
  amount,
  currency = "INR",
  name = "Book Yatra",
  description,
  prefill = {},
}) {
  const Razorpay = await loadScriptOnce();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key,
      order_id: orderId,
      amount,
      currency,
      name,
      description,
      prefill,
      theme: { color: "#D95D39" },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
      handler: (resp) =>
        resolve({
          paymentId: resp.razorpay_payment_id,
          orderId: resp.razorpay_order_id,
          signature: resp.razorpay_signature,
        }),
    });
    rzp.on?.("payment.failed", (e) =>
      reject(new Error(e?.error?.description || "Payment failed")),
    );
    rzp.open();
  });
}

export const isWeb = Platform.OS === "web";
