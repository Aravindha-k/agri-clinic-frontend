import logo from "../assets/logo.png";

const SIZE_MAP = {
  xs: { box: "w-7 h-7", img: "w-5 h-5" },
  header: { box: "w-9 h-9", img: "w-7 h-7" },
  sm: { box: "w-10 h-10", img: "w-8 h-8" },
  nav: { box: "w-11 h-11", img: "w-9 h-9" },
  md: { box: "w-12 h-12", img: "w-10 h-10" },
  lg: { box: "w-16 h-16", img: "w-[3.25rem] h-[3.25rem]" },
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
        width={256}
        height={256}
        className={`brand-logo-img ${dims.img} ${className}`}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
