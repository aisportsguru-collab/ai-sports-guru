export const ENV = {
  API_BASE: process.env.EXPO_PUBLIC_API_BASE || "",
  FROM: process.env.EXPO_PUBLIC_DEFAULT_FROM || "",
  TO: process.env.EXPO_PUBLIC_DEFAULT_TO || "",
  ADMIN_EMAILS: (process.env.EXPO_PUBLIC_ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL || "",
  TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL || "",
};
