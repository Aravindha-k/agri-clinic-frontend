import logo from "../assets/logo.png";

const SIZE_MAP = {
  xs: { box: "w-7 h-7", img: "w-5 h-5" },
  sm: { box: "w-9 h-9", img: "w-7 h-7" },
  md: { box: "w-11 h-11", img: "w-9 h-9" },
  lg: { box: "w-14 h-14", img: "w-11 h-11" },
  xl: { box: "w-20 h-20", img: "w-16 h-16" },
  hero: { box: "w-28 h-28", img: "w-24 h-24" },
};

/**
 * Crisp Kavya logo — fixed aspect ratio, object-contain, no stretch.
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
        width={256}
        height={256}
        className={`${dims.img} object-contain select-none ${className}`}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
