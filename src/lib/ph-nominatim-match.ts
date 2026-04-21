/**
 * Map Nominatim reverse-geocode `address` object to Wilfredpine PSGC-style codes
 * used by the client address form.
 */

export type PhRegion = { region_code: string; region_name: string };
export type PhProvince = {
  region_code: string;
  province_code: string;
  province_name: string;
};
export type PhCity = {
  province_code: string;
  city_code: string;
  city_name: string;
};
export type PhBarangay = {
  city_code: string;
  brgy_code: string;
  brgy_name: string;
};

export type PhCodeMatch = {
  regionCode: string;
  provinceCode: string;
  cityCode: string;
  barangayCode: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNoise(s: string): string {
  return norm(
    s
      .replace(/\b(lgu|the|of|city|municipality|province|region)\b/gi, "")
      .replace(/\b(ph|philippines)\b/gi, "")
  );
}

function looseMatch(dbName: string, hint: string | undefined): boolean {
  if (!hint?.trim()) return false;
  const a = stripNoise(dbName);
  const b = stripNoise(hint);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" ").filter((w) => w.length > 2));
  for (const w of b.split(" ")) {
    if (w.length < 3) continue;
    if (ta.has(w) || [...ta].some((x) => x.includes(w) || w.includes(x))) return true;
  }
  return false;
}

function bestRegion(regions: PhRegion[], state: string | undefined): PhRegion | null {
  if (!state?.trim() || regions.length === 0) return null;
  const s = state.trim();
  // Parenthetical e.g. "Region IV-A (CALABARZON)" ↔ "Calabarzon"
  for (const r of regions) {
    const paren = r.region_name.match(/\(([^)]+)\)/);
    if (paren && looseMatch(paren[1], s)) return r;
  }
  const hits = regions.filter((r) => looseMatch(r.region_name, s));
  if (hits.length >= 1) return hits[0];

  // NCR / Metro Manila
  const n = norm(s);
  if (n.includes("metro") && n.includes("manila")) {
    const ncr = regions.find((r) => norm(r.region_name).includes("ncr"));
    if (ncr) return ncr;
  }
  return null;
}

function bestProvince(
  provinces: PhProvince[],
  regionCode: string,
  county: string | undefined
): PhProvince | null {
  const list = provinces.filter((p) => p.region_code === regionCode);
  if (list.length === 0) return null;
  if (!county?.trim()) return null;

  return list.find((p) => looseMatch(p.province_name, county)) ?? null;
}

function bestCity(
  cities: PhCity[],
  provinceCode: string,
  cityHint: string | undefined
): PhCity | null {
  const list = cities.filter((c) => c.province_code === provinceCode);
  if (list.length === 0) return null;
  if (!cityHint?.trim()) return null;

  const hit = list.find((c) => looseMatch(c.city_name, cityHint));
  if (hit) return hit;

  const simplified = cityHint.replace(/^city\s+of\s+/i, "").trim();
  return list.find((c) => looseMatch(c.city_name, simplified)) ?? null;
}

/** When county/province is missing from OSM, find city by searching all provinces in the region. */
function findProvinceAndCityInRegion(
  regionCode: string,
  cityHint: string | undefined,
  provinces: PhProvince[],
  cities: PhCity[]
): { province: PhProvince; city: PhCity } | null {
  if (!cityHint?.trim()) return null;
  const provList = provinces.filter((p) => p.region_code === regionCode);
  for (const prov of provList) {
    const city = bestCity(cities, prov.province_code, cityHint);
    if (city) return { province: prov, city };
  }
  return null;
}

function bestBarangay(
  barangays: PhBarangay[],
  cityCode: string,
  brgyHint: string | undefined
): PhBarangay | null {
  const list = barangays.filter((b) => b.city_code === cityCode);
  if (list.length === 0) return null;
  if (!brgyHint?.trim()) return null;

  const hit = list.find((b) => looseMatch(b.brgy_name, brgyHint));
  if (hit) return hit;

  const simplified = brgyHint.replace(/^barangay\s+/i, "brgy ").trim();
  const hit2 = list.find((b) => looseMatch(b.brgy_name, simplified));
  return hit2 ?? null;
}

function pickAddressField(
  addr: Record<string, string | undefined>,
  keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = addr[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/**
 * Returns best PSGC codes from Nominatim `address` object, or null if region cannot be resolved.
 */
export function matchPhCodesFromNominatimAddress(
  addr: Record<string, string | undefined>,
  regions: PhRegion[],
  provinces: PhProvince[],
  cities: PhCity[],
  barangays: PhBarangay[]
): PhCodeMatch | null {
  const state = pickAddressField(addr, ["state", "region"]);
  const provinceHint = pickAddressField(addr, [
    "county",
    "state_district",
    "province",
  ]);
  const cityHint = pickAddressField(addr, [
    "city",
    "town",
    "municipality",
    "city_district",
  ]);
  const brgyHint = pickAddressField(addr, [
    "village",
    "suburb",
    "neighbourhood",
    "quarter",
    "hamlet",
  ]);

  const region = bestRegion(regions, state);
  if (!region) return null;

  let province = bestProvince(
    provinces,
    region.region_code,
    provinceHint ?? pickAddressField(addr, ["county"])
  );
  let city =
    province && cityHint
      ? bestCity(cities, province.province_code, cityHint)
      : null;

  if (!province || !city) {
    const found = findProvinceAndCityInRegion(
      region.region_code,
      cityHint,
      provinces,
      cities
    );
    if (found) {
      province = found.province;
      city = found.city;
    }
  }

  if (!province) {
    return {
      regionCode: region.region_code,
      provinceCode: "",
      cityCode: "",
      barangayCode: "",
    };
  }

  if (!city) {
    return {
      regionCode: region.region_code,
      provinceCode: province.province_code,
      cityCode: "",
      barangayCode: "",
    };
  }

  const brgy = bestBarangay(barangays, city.city_code, brgyHint);

  return {
    regionCode: region.region_code,
    provinceCode: province.province_code,
    cityCode: city.city_code,
    barangayCode: brgy?.brgy_code ?? "",
  };
}
