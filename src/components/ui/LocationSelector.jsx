import { useEffect, useState, useCallback, useRef } from "react";
import { getDistricts, fetchTaluksByDistrict, fetchVillagesByTaluk } from "../../api/master.api";
import { findDistrictByName } from "../../utils/locationDisplay";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import ErrorRetry from "./ErrorRetry";

const resolveList = (d) => {
  const raw = d?.data ?? d;
  if (Array.isArray(raw)) return raw;
  if (raw?.results) return raw.results;
  if (raw?.data) return raw.data;
  return [];
};

/**
 * District → Taluk → Village cascade.
 * Does not fetch all villages at startup.
 */
export default function LocationSelector({
  value = {},
  onChange,
  className = "",
  defaultDistrictName = null,
  disabled = false,
}) {
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState("");

  const [taluks, setTaluks] = useState([]);
  const [taluksLoading, setTaluksLoading] = useState(false);
  const [taluksError, setTaluksError] = useState("");

  const [villages, setVillages] = useState([]);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [villagesError, setVillagesError] = useState("");

  const defaultAppliedRef = useRef(false);

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true);
    setDistrictsError("");
    try {
      const raw = await getDistricts();
      setDistricts(resolveList(raw));
    } catch {
      setDistrictsError("Could not load districts");
      setDistricts([]);
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDistricts();
  }, [loadDistricts]);

  // Optional default district (resolved from backend list, not hardcoded id)
  useEffect(() => {
    if (defaultAppliedRef.current || !defaultDistrictName || value.district || districtsLoading) return;
    const match = findDistrictByName(districts, defaultDistrictName);
    if (match?.id) {
      defaultAppliedRef.current = true;
      onChange?.({
        district: String(match.id),
        district_name: match.name || "",
        taluk: "",
        taluk_name: "",
        village: "",
        village_name: "",
      });
    }
  }, [defaultDistrictName, districts, districtsLoading, value.district, onChange]);

  useEffect(() => {
    if (!value.district) {
      setTaluks([]);
      setTaluksError("");
      return;
    }
    let active = true;
    (async () => {
      setTaluksLoading(true);
      setTaluksError("");
      try {
        const rows = await fetchTaluksByDistrict(value.district);
        if (active) setTaluks(rows);
      } catch {
        if (active) {
          setTaluksError("Could not load taluks");
          setTaluks([]);
        }
      } finally {
        if (active) setTaluksLoading(false);
      }
    })();
    return () => { active = false; };
  }, [value.district]);

  useEffect(() => {
    if (!value.taluk) {
      setVillages([]);
      setVillagesError("");
      return;
    }
    let active = true;
    (async () => {
      setVillagesLoading(true);
      setVillagesError("");
      try {
        const rows = await fetchVillagesByTaluk(value.taluk);
        if (active) setVillages(rows);
      } catch {
        if (active) {
          setVillagesError("Could not load villages");
          setVillages([]);
        }
      } finally {
        if (active) setVillagesLoading(false);
      }
    })();
    return () => { active = false; };
  }, [value.taluk]);

  const handleDistrictChange = (districtId) => {
    const dist = districts.find((d) => String(d.id) === String(districtId));
    onChange?.({
      district: districtId || "",
      district_name: dist?.name || "",
      taluk: "",
      taluk_name: "",
      village: "",
      village_name: "",
    });
  };

  const handleTalukChange = (talukId) => {
    const tal = taluks.find((t) => String(t.id) === String(talukId));
    onChange?.({
      ...value,
      taluk: talukId || "",
      taluk_name: tal?.name || "",
      village: "",
      village_name: "",
    });
  };

  const handleVillageChange = (villageId) => {
    const vlg = villages.find((v) => String(v.id) === String(villageId));
    onChange?.({
      ...value,
      village: villageId || "",
      village_name: vlg?.name || "",
    });
  };

  const selectClass = "select";
  const legacyTalukMissing = Boolean(value.village && !value.taluk);

  return (
    <div className={`location-cascade grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      <div>
        <label className="form-label flex items-center gap-1" htmlFor="loc-district">
          <MapPin className="w-3 h-3" aria-hidden="true" /> District
        </label>
        <div className="relative">
          <select
            id="loc-district"
            value={String(value.district || "")}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={disabled || districtsLoading}
            className={`${selectClass} disabled:opacity-50`}
            aria-busy={districtsLoading}
          >
            <option value="">{districtsLoading ? "Loading districts…" : "Select district"}</option>
            {districts.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        </div>
        {districtsError ? (
          <ErrorRetry compact message={districtsError} onRetry={loadDistricts} className="mt-2" />
        ) : null}
      </div>

      <div>
        <label className="form-label flex items-center gap-1" htmlFor="loc-taluk">
          <MapPin className="w-3 h-3" aria-hidden="true" /> Taluk
        </label>
        <div className="relative">
          <select
            id="loc-taluk"
            value={String(value.taluk || "")}
            onChange={(e) => handleTalukChange(e.target.value)}
            disabled={disabled || !value.district || taluksLoading}
            className={`${selectClass} disabled:opacity-50`}
            aria-busy={taluksLoading}
            aria-describedby={legacyTalukMissing ? "loc-taluk-legacy" : undefined}
          >
            <option value="">
              {!value.district
                ? "Select district first"
                : taluksLoading
                  ? "Loading taluks…"
                  : taluks.length === 0
                    ? "No taluks available"
                    : "Select taluk"}
            </option>
            {taluks.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          {taluksLoading ? (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 animate-spin" aria-hidden="true" />
          ) : null}
        </div>
        {legacyTalukMissing ? (
          <p id="loc-taluk-legacy" className="mt-1 text-xs text-slate-500">
            Legacy record — taluk not assigned. Select taluk to update location.
          </p>
        ) : null}
        {taluksError ? (
          <p className="mt-1 text-xs text-red-600">{taluksError} · <button type="button" className="underline" onClick={() => handleDistrictChange(value.district)}>Retry</button></p>
        ) : null}
      </div>

      <div>
        <label className="form-label flex items-center gap-1" htmlFor="loc-village">
          <MapPin className="w-3 h-3" aria-hidden="true" /> Village
        </label>
        <div className="relative">
          <select
            id="loc-village"
            value={String(value.village || "")}
            onChange={(e) => handleVillageChange(e.target.value)}
            disabled={disabled || !value.taluk || villagesLoading}
            className={`${selectClass} disabled:opacity-50`}
            aria-busy={villagesLoading}
          >
            <option value="">
              {!value.taluk
                ? "Select taluk first"
                : villagesLoading
                  ? "Loading villages…"
                  : villages.length === 0
                    ? "No villages available"
                    : "Select village"}
            </option>
            {villages.map((v) => (
              <option key={v.id} value={String(v.id)}>{v.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          {villagesLoading ? (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 animate-spin" aria-hidden="true" />
          ) : null}
        </div>
        {villagesError ? (
          <p className="mt-1 text-xs text-red-600">{villagesError} · <button type="button" className="underline" onClick={() => handleTalukChange(value.taluk)}>Retry</button></p>
        ) : null}
      </div>
    </div>
  );
}
