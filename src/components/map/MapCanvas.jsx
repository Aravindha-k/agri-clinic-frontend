import AdminMapFrame from "./AdminMapFrame";

/**
 * Always-visible Leaflet canvas inside the shared admin map shell.
 * Forwards all AdminMapFrame props; applies shell sizing classes.
 */
export default function MapCanvas({
  size = "default",
  className = "",
  frameClassName = "",
  height,
  style,
  ...frameProps
}) {
  const sizeClass =
    size === "compact"
      ? "admin-map-shell--compact"
      : size === "drawer"
        ? "admin-map-shell--drawer"
        : size === "mini"
          ? "admin-map-shell--mini"
          : size === "live"
            ? "admin-map-shell--live"
            : "";

  const shellStyle =
    height != null
      ? { height, minHeight: height, ...style }
      : style;

  return (
    <div className={`admin-map-shell ${sizeClass} ${className}`.trim()} style={shellStyle}>
      <AdminMapFrame
        className={`admin-map-shell__frame ${frameClassName}`.trim()}
        mapClassName="admin-map-shell__leaflet"
        height={height ?? "100%"}
        {...frameProps}
      />
    </div>
  );
}
