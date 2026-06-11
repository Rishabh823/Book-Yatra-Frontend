const WEB_BASE = "https://shyamsawariyaparivar.com";
export const FALLBACK_IMG =
  "https://images.pexels.com/photos/11398067/pexels-photo-11398067.jpeg";

export function resolveImageUrl(url) {
  if (!url) return FALLBACK_IMG;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return WEB_BASE + url;
  return FALLBACK_IMG;
}

export function fmtDate(d, opts) {
  try {
    return new Date(d).toLocaleDateString(
      "en-IN",
      opts || { month: "short", day: "numeric", year: "numeric" },
    );
  } catch {
    return "";
  }
}

export function fmtCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
