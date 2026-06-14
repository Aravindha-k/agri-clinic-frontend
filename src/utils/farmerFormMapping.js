import { resolveVillageLabel } from "./displayValue";

/** Resolve village id from a farmer API record. */
export function resolveFarmerVillageId(farmer, villages = []) {
  if (!farmer) return null;
  const direct =
    farmer.village_id ??
    (typeof farmer.village === "number" ? farmer.village : null) ??
    (typeof farmer.village === "object" ? farmer.village?.id : null);
  if (direct != null && direct !== "") return Number(direct) || direct;

  const label = resolveVillageLabel(farmer.village_name ?? farmer.village, "");
  if (!label || label === "—") return null;
  const match = (villages || []).find(
    (v) => String(v.name || "").toLowerCase() === String(label).toLowerCase()
  );
  return match?.id ?? null;
}

export function resolveFarmerPhone(farmer) {
  return String(farmer?.phone ?? farmer?.mobile ?? "").replace(/\D/g, "") || "";
}

/** Map GET /farmers/ row → Add Visit farmer fields */
export function farmerRecordToVisitForm(farmer, villages = []) {
  if (!farmer) return null;
  return {
    farmer_id: farmer.id,
    farmer_name: String(farmer.name ?? farmer.farmer_name ?? "").trim(),
    farmer_phone: resolveFarmerPhone(farmer),
    village: resolveFarmerVillageId(farmer, villages),
  };
}

export function farmersToDropdownOptions(farmers = []) {
  return farmers.map((f) => {
    const name = String(f.name ?? f.farmer_name ?? "Farmer").trim();
    const phone = f.phone || f.mobile;
    const village = f.village_name || resolveVillageLabel(f.village, "");
    const sub = [phone, village].filter(Boolean).join(" · ");
    return {
      id: f.id,
      name: sub ? `${name} — ${sub}` : name,
    };
  });
}
