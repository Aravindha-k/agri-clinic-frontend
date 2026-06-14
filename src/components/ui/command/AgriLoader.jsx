import BrandLoader from "../BrandLoader";

/** Backward-compatible wrapper — maps legacy size prop to BrandLoader variants */
export default function AgriLoader({ label = "Loading…", size = "md", className = "" }) {
  const variant = size === "sm" ? "compact" : "inline";
  return (
    <BrandLoader
      variant={variant}
      label={label}
      showTitle={size !== "sm"}
      showYearsTagline={size !== "sm"}
      className={className}
    />
  );
}

export { PageLoader } from "../BrandLoader";
