/**
 * Kavya Agri Clinic — official brand palette (from logo guide).
 * Use CSS variables in styles; import this for JS/chart contexts.
 */
export const BRAND = {
  primary: "#1E8449",
  primaryDark: "#145A32",
  primaryLight: "#48BB78",
  accent: "#ED8936",
  black: "#071713",
  ink: "#0f172a",
  white: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f4f7f5",
  success: "#48BB78",
  successDark: "#1E8449",
  info: "#0e7490",
  infoLight: "#cffafe",
  warning: "#ED8936",
  warningLight: "#ffedd5",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    500: "#64748b",
    700: "#334155",
    900: "#0f172a",
  },
};

export const BRAND_GRADIENTS = {
  primary: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
  hero: `linear-gradient(155deg, ${BRAND.black} 0%, #0d2b24 38%, ${BRAND.primary} 100%)`,
  sidebar: `linear-gradient(180deg, ${BRAND.black} 0%, #0d2b24 50%, #123f2b 100%)`,
  page: `radial-gradient(circle at top left, rgba(30, 132, 73, 0.10), transparent 34%), linear-gradient(135deg, #f8fafc 0%, #eef6f2 100%)`,
  cardGreen: `linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)`,
  cardAccent: `linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)`,
};

/** Chart series colors — primary green first, then supporting palette */
export const CHART_COLORS = {
  primary: BRAND.primary,
  secondary: BRAND.primaryLight,
  accent: BRAND.accent,
  areaFill: BRAND.primary,
  routeBar: BRAND.primary,
  grid: "#e5e7eb",
  axis: "#9CA3AF",
};

/** Dashboard KPI card themes — all derived from brand */
export const KPI_THEMES = {
  farmers: { gradient: BRAND_GRADIENTS.cardGreen, iconBg: "#dcfce7", iconColor: BRAND.primary },
  fields: { gradient: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)", iconBg: "#d1fae5", iconColor: BRAND.primaryLight },
  visits: { gradient: BRAND_GRADIENTS.cardAccent, iconBg: "#ffedd5", iconColor: BRAND.accent },
  issues: { gradient: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)", iconBg: BRAND.dangerLight, iconColor: BRAND.danger },
  today: { gradient: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)", iconBg: "#bbf7d0", iconColor: BRAND.primaryDark },
  working: { gradient: "linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)", iconBg: BRAND.infoLight, iconColor: BRAND.info },
  gps: { gradient: BRAND_GRADIENTS.cardGreen, iconBg: "#dcfce7", iconColor: BRAND.successDark },
};
