import logo from "../assets/logo.png";

const SIZE_MAP = {
  xs: { box: "w-7 h-7", img: "w-full h-full" },
  /** Legacy header size (header no longer shows company logo) */
  header: { box: "w-[50px] h-[50px]", img: "w-full h-full" },
  sm: { box: "w-10 h-10", img: "w-full h-full" },
  /** Sidebar brand — circular seal face (used in two-sided coin) */
  sidebar: {
    box: "w-full h-full !rounded-full !overflow-hidden",
    img: "w-full h-full !rounded-full !object-contain",
  },
  nav: { box: "w-11 h-11", img: "w-full h-full" },
  md: { box: "w-12 h-12", img: "w-full h-full" },
  lg: { box: "w-16 h-16", img: "w-full h-full" },
  xl: { box: "w-20 h-20", img: "w-full h-full" },
  hero: { box: "w-28 h-28", img: "w-full h-full" },
};

/**
 * Official Kavya seal — one asset, object-contain, image fills the box.
 * Sizes set the outer box; the <img> always fills it (no progressive shrink).
 */
export default function Logo({
  size = "md",
  variant = "default",
  className = "",
  containerClassName = "",
  showShadow = true,
  alt = "Kavya Agri Clinic",
}) {
  const dims = SIZE_MAP[size] ?? SIZE_MAP.md;
  const variantClass =
    variant === "sidebar"
      ? "brand-logo-box brand-logo-box--sidebar"
      : variant === "header"
        ? "brand-logo-box brand-logo-box--header"
        : variant === "login"
          ? "brand-logo-box brand-logo-box--login"
          : "brand-logo-box";

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 ${variantClass} ${dims.box} ${containerClassName} ${
        showShadow ? "brand-logo-shadow" : ""
      }`}
    >
      <img
        src={logo}
        alt={alt}
        width={888}
        height={888}
        className={`brand-logo-img ${dims.img} ${className}`}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
