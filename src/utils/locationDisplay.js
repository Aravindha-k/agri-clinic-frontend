import { DISPLAY_FALLBACK, resolveVillageLabel } from "./displayValue";

/** Operational location display is village-only. */
export function resolveLocationBlock(entity = {}) {
  const village =
    entity.village_name ||
    resolveVillageLabel(entity.village ?? entity.village_id, DISPLAY_FALLBACK);

  return { village };
}
