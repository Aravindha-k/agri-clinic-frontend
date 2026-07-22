import MapLocationHeader from "./MapLocationHeader";
import MapCanvas from "./MapCanvas";
import MapInfoFooter from "./MapInfoFooter";

/**
 * Shared admin map page shell: location header + map canvas + info footer.
 */
export default function AdminMapCard({
  title,
  subtitle,
  locationLabel = null,
  lat = null,
  lng = null,
  locationLoading = false,
  headerActions = null,
  mapsAriaLabel = null,
  showOpenInMaps = true,
  footerMessage = null,
  footerIcon,
  mapSize = "default",
  mapProps = {},
  mapChildren = null,
  className = "",
  headerClassName = "",
  beforeMap = null,
}) {
  return (
    <section className={`admin-map-card ${className}`.trim()} aria-label={title ?? "Map"}>
      {(title || subtitle || locationLabel || headerActions || (showOpenInMaps && lat != null)) && (
        <MapLocationHeader
          title={title}
          subtitle={subtitle}
          locationLabel={locationLabel}
          lat={lat}
          lng={lng}
          locationLoading={locationLoading}
          actions={headerActions}
          mapsAriaLabel={mapsAriaLabel}
          showOpenInMaps={showOpenInMaps}
          className={headerClassName}
        />
      )}

      {beforeMap}

      <MapCanvas size={mapSize} {...mapProps}>
        {mapChildren}
      </MapCanvas>

      <MapInfoFooter message={footerMessage} icon={footerIcon} />
    </section>
  );
}
