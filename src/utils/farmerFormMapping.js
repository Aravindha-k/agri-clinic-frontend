import { resolveVillageLabel } from "./displayValue";

/** Coerce nested FK objects / ids to a select-safe string id. */
function toId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    const id = value.id ?? value.pk ?? value.value;
    return id == null ? "" : String(id);
  }
  return String(value);
}

/** Resolve village id from a farmer API record. */
export function resolveFarmerVillageId(farmer) {
  if (!farmer) return null;
  const direct =
    farmer.village_id ??
    (typeof farmer.village === "number" ? farmer.village : null) ??
    (typeof farmer.village === "object" ? farmer.village?.id : null);
  if (direct != null && direct !== "") return toId(direct);
  return null;
}

export function resolveFarmerPhone(farmer) {
  return String(farmer?.phone ?? farmer?.mobile ?? "").replace(/\D/g, "") || "";
}

/** Map GET /farmers/ row → Add Visit farmer + location fields */
export function farmerRecordToVisitForm(farmer) {
  if (!farmer) return null;
  return {
    farmer_id: farmer.id,
    farmer_name: String(farmer.name ?? farmer.farmer_name ?? "").trim(),
    farmer_phone: resolveFarmerPhone(farmer),
    district: toId(farmer.district ?? farmer.district_id),
    district_name:
      farmer.district_name ||
      (typeof farmer.district === "object" ? farmer.district?.name : "") ||
      "",
    taluk: toId(farmer.taluk ?? farmer.taluk_id),
    taluk_name:
      farmer.taluk_name ||
      (typeof farmer.taluk === "object" ? farmer.taluk?.name : "") ||
      "",
    village: resolveFarmerVillageId(farmer) || toId(farmer.village ?? farmer.village_id),
    village_name:
      farmer.village_name ||
      (typeof farmer.village === "object" ? farmer.village?.name : "") ||
      resolveVillageLabel(farmer.village, ""),
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
