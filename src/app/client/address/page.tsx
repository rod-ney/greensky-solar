"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  MapPinned,
  Edit2,
  Trash2,
  Star,
  Zap,
  Receipt,
  ChevronDown,
  ChevronUp,
  Home,
  Building2,
  Palmtree,
  Navigation,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import { matchPhCodesFromNominatimAddress } from "@/lib/ph-nominatim-match";
import type { SavedAddress, Appliance } from "@/types/client";

const DynamicMapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <p className="text-xs text-slate-500">Loading interactive map…</p>
    </div>
  ),
});

type Region = {
  region_code: string;
  region_name: string;
};

type Province = {
  region_code: string;
  province_code: string;
  province_name: string;
};

type City = {
  province_code: string;
  city_code: string;
  city_name: string;
};

type Barangay = {
  city_code: string;
  brgy_code: string;
  brgy_name: string;
};

const addressIcons: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Office: <Building2 className="h-4 w-4" />,
  "Vacation House": <Palmtree className="h-4 w-4" />,
};

const applianceOptions = [
  "Air Conditioner",
  "Refrigerator",
  "Washing Machine",
  "Television",
  "Electric Fan",
  "Microwave",
  "Rice Cooker",
  "Laptop/Computer",
  "Water Heater",
  "Electric Stove",
];

const LAST_KNOWN_GEO_PIN_KEY = "client:lastKnownGeoPin";
const PH_ADDRESS_DATA_CACHE_KEY = "client:phAddressData";
const PH_ADDRESS_DATA_VERSION = "v1"; // Increment to invalidate cache

export default function AddressPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(addresses[0]?.id ?? null);
  const [selectedAddr, setSelectedAddr] = useState<SavedAddress | null>(addresses[0] ?? null);
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await fetch("/api/client/addresses", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as SavedAddress[];
        setAddresses(data);
        if (data.length > 0) {
          setSelectedAddr(data[0]);
          setExpandedId(data[0].id);
          setPinLat(data[0].lat);
          setPinLng(data[0].lng);
        }
      } catch {
        setAddresses([]);
      }
    };
    void loadAddresses();
  }, []);

  const [showSavedAddressesModal, setShowSavedAddressesModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showSetDefaultConfirm, setShowSetDefaultConfirm] = useState(false);
  const [defaultTargetId, setDefaultTargetId] = useState<string | null>(null);
  const [setDefaultSubmitting, setSetDefaultSubmitting] = useState(false);

  // PH address selector data (Wilfredpine PSGC JSON)
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [isLoadingPhData, setIsLoadingPhData] = useState(true);
  const [phDataError, setPhDataError] = useState("");

  // Selector state (codes, not names)
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [selectedBarangayCode, setSelectedBarangayCode] = useState("");
  const [selectorLabel, setSelectorLabel] = useState("");
  const [selectorStreet, setSelectorStreet] = useState("");
  const [selectorZipCode, setSelectorZipCode] = useState("");
  const [selectorBill, setSelectorBill] = useState("");
  const [selectorMessage, setSelectorMessage] = useState("");
  const [selectedAppliances, setSelectedAppliances] = useState<Record<string, number>>({});
  const [otherApplianceName, setOtherApplianceName] = useState("");
  const [otherApplianceQty, setOtherApplianceQty] = useState("1");
  const [otherAppliances, setOtherAppliances] = useState<
    Array<{ name: string; quantity: number }>
  >([]);

  // Map pin state
  const [pinLat, setPinLat] = useState(selectedAddr?.lat ?? 14.5547);
  const [pinLng, setPinLng] = useState(selectedAddr?.lng ?? 121.0244);
  const [isLocating, setIsLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState("");
  const [focusPinKey, setFocusPinKey] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(pinLat) || !Number.isFinite(pinLng)) return;
    try {
      localStorage.setItem(
        LAST_KNOWN_GEO_PIN_KEY,
        JSON.stringify({ lat: pinLat, lng: pinLng, updatedAt: Date.now() })
      );
    } catch {
      // Ignore storage errors in private mode/restricted environments
    }
  }, [pinLat, pinLng]);

  // Load PH address hierarchy from Wilfredpine JSON (remote, cached by browser)
  useEffect(() => {
    async function loadPhData() {
      try {
        setIsLoadingPhData(true);

        // Try loading from localStorage cache first
        try {
          const cached = localStorage.getItem(PH_ADDRESS_DATA_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (
              parsed.version === PH_ADDRESS_DATA_VERSION &&
              parsed.regions &&
              parsed.provinces &&
              parsed.cities &&
              parsed.barangays
            ) {
              setRegions(parsed.regions);
              setProvinces(parsed.provinces);
              setCities(parsed.cities);
              setBarangays(parsed.barangays);
              setPhDataError("");
              setIsLoadingPhData(false);
              return; // Use cached data, skip network fetch
            }
          }
        } catch {
          // Cache read failed, continue to network fetch
        }

        // Fetch from network
        const [regionRes, provinceRes, cityRes, barangayRes] = await Promise.all([
          fetch(
            "https://raw.githubusercontent.com/wilfredpine/philippine-address-selector/main/ph-json/region.json"
          ),
          fetch(
            "https://raw.githubusercontent.com/wilfredpine/philippine-address-selector/main/ph-json/province.json"
          ),
          fetch(
            "https://raw.githubusercontent.com/wilfredpine/philippine-address-selector/main/ph-json/city.json"
          ),
          fetch(
            "https://raw.githubusercontent.com/wilfredpine/philippine-address-selector/main/ph-json/barangay.json"
          ),
        ]);

        if (!regionRes.ok || !provinceRes.ok || !cityRes.ok || !barangayRes.ok) {
          throw new Error("Failed to load PH address data");
        }

        const [regionData, provinceData, cityData, barangayData] = await Promise.all([
          regionRes.json(),
          provinceRes.json(),
          cityRes.json(),
          barangayRes.json(),
        ]);

        setRegions(regionData);
        setProvinces(provinceData);
        setCities(cityData);
        setBarangays(barangayData);
        setPhDataError("");

        // Cache the successful fetch
        try {
          localStorage.setItem(
            PH_ADDRESS_DATA_CACHE_KEY,
            JSON.stringify({
              version: PH_ADDRESS_DATA_VERSION,
              regions: regionData,
              provinces: provinceData,
              cities: cityData,
              barangays: barangayData,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // Storage quota exceeded or disabled, continue anyway
        }
      } catch (error) {
        console.warn("PH address data fetch failed:", error);
        
        // Try one more time to load from cache as ultimate fallback
        try {
          const cached = localStorage.getItem(PH_ADDRESS_DATA_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.regions && parsed.provinces && parsed.cities && parsed.barangays) {
              setRegions(parsed.regions);
              setProvinces(parsed.provinces);
              setCities(parsed.cities);
              setBarangays(parsed.barangays);
              setPhDataError("Using offline address data (last updated: " + 
                new Date(parsed.cachedAt || 0).toLocaleDateString() + ")");
              setIsLoadingPhData(false);
              return;
            }
          }
        } catch {
          // Cache fallback also failed
        }

        setPhDataError("Address data unavailable offline. Connect to internet to load locations.");
      } finally {
        setIsLoadingPhData(false);
      }
    }

    loadPhData();
  }, []);

  const getRegionName = useCallback(
    (code: string) =>
      regions.find((r) => r.region_code === code)?.region_name ?? "",
    [regions]
  );
  const getProvinceName = useCallback(
    (code: string) =>
      provinces.find((p) => p.province_code === code)?.province_name ?? "",
    [provinces]
  );
  const getCityName = useCallback(
    (code: string) =>
      cities.find((c) => c.city_code === code)?.city_name ?? "",
    [cities]
  );
  const getBarangayName = useCallback(
    (code: string) =>
      barangays.find((b) => b.brgy_code === code)?.brgy_name ?? "",
    [barangays]
  );

  const selectAddress = useCallback(
    (addr: SavedAddress) => {
      setSelectedAddr(addr);
      setPinLat(addr.lat);
      setPinLng(addr.lng);
      setExpandedId(addr.id);
    },
    []
  );

  const fillSelectorsFromCoordinates = useCallback(
    async (lat: number, lng: number) => {
      if (
        regions.length === 0 ||
        provinces.length === 0 ||
        cities.length === 0 ||
        barangays.length === 0
      ) {
        setSelectorMessage(
          "Address data is still loading. Click Locate me again in a few seconds."
        );
        return;
      }
      try {
        setSelectorMessage(
          "Matching your location to region, province, city, and barangay…"
        );
        const res = await fetch(
          `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
        );
        if (!res.ok) throw new Error("reverse failed");
        const data = (await res.json()) as { address?: Record<string, string> };
        const raw = data.address;
        if (!raw) throw new Error("no address in response");

        const matched = matchPhCodesFromNominatimAddress(
          raw as Record<string, string | undefined>,
          regions,
          provinces,
          cities,
          barangays
        );
        if (!matched?.regionCode) {
          setSelectorMessage(
            "Could not match this pin to the Philippine address list. Choose region, province, city, and barangay manually."
          );
          return;
        }

        setSelectedRegionCode(matched.regionCode);
        setSelectedProvinceCode(matched.provinceCode);
        setSelectedCityCode(matched.cityCode);
        setSelectedBarangayCode(matched.barangayCode);

        const filled: string[] = [];
        if (matched.provinceCode) filled.push("province");
        if (matched.cityCode) filled.push("city");
        if (matched.barangayCode) filled.push("barangay");
        setSelectorMessage(
          filled.length > 0
            ? `Filled ${filled.join(", ")} from your pinned location.`
            : "Region set from your location — select province, city, and barangay below."
        );
      } catch (e) {
        console.warn("Reverse geocode:", e);
        setSelectorMessage(
          "Location pinned; automatic address lookup failed. Use the dropdowns to complete your address."
        );
      }
    },
    [regions, provinces, cities, barangays]
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      setSetDefaultSubmitting(true);
      try {
        const response = await fetch(`/api/client/addresses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        });
        if (!response.ok) {
          toast.error("Failed to set default address.");
          return;
        }
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === id }))
        );
        setShowSetDefaultConfirm(false);
        setDefaultTargetId(null);
        toast.success("Default address updated.");
      } catch {
        toast.error("Failed to set default address.");
      } finally {
        setSetDefaultSubmitting(false);
      }
    },
    []
  );

  const handleLocateMe = useCallback(() => {
    const readStoredPin = (): { lat: number; lng: number } | null => {
      try {
        const raw = localStorage.getItem(LAST_KNOWN_GEO_PIN_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
        if (
          typeof parsed.lat !== "number" ||
          typeof parsed.lng !== "number" ||
          !Number.isFinite(parsed.lat) ||
          !Number.isFinite(parsed.lng)
        ) {
          return null;
        }
        return { lat: parsed.lat, lng: parsed.lng };
      } catch {
        return null;
      }
    };

    const applyStoredPin = (message: string): boolean => {
      const stored = readStoredPin();
      if (!stored) return false;
      const lat = Number(stored.lat.toFixed(6));
      const lng = Number(stored.lng.toFixed(6));
      setPinLat(lat);
      setPinLng(lng);
      setFocusPinKey((k) => k + 1);
      setIsLocating(false);
      setLocateMessage(message);
      void fillSelectorsFromCoordinates(lat, lng);
      return true;
    };

    if (!("geolocation" in navigator)) {
      if (
        applyStoredPin(
          "Geolocation is not supported here. Pinned your last saved location instead."
        )
      ) {
        return;
      }
      setLocateMessage("Geolocation is not supported in this browser.");
      return;
    }

    if (!window.isSecureContext) {
      if (
        applyStoredPin(
          "Live location requires localhost/HTTPS. Pinned your last saved location instead."
        )
      ) {
        return;
      }
      setLocateMessage("Location requires a secure origin. Use localhost or HTTPS.");
      return;
    }

    const applyPosition = (pos: GeolocationPosition, fromCache: boolean) => {
      const { latitude, longitude } = pos.coords;
      const lat = Number(latitude.toFixed(6));
      const lng = Number(longitude.toFixed(6));
      setPinLat(lat);
      setPinLng(lng);
      try {
        localStorage.setItem(
          LAST_KNOWN_GEO_PIN_KEY,
          JSON.stringify({ lat: latitude, lng: longitude, updatedAt: Date.now() })
        );
      } catch {
        // Ignore storage errors
      }
      setFocusPinKey((k) => k + 1);
      setIsLocating(false);
      setLocateMessage(
        fromCache
          ? "Pinned your last known location (offline fallback)."
          : "Location pinned from your device."
      );
      void fillSelectorsFromCoordinates(lat, lng);
    };

    const handleFinalError = (err: GeolocationPositionError) => {
      console.warn(`Geolocation failed: [${err.code}] ${err.message}`);

      if (
        applyStoredPin(
          "Live location unavailable offline. Pinned your last saved location instead."
        )
      ) {
        return;
      }

      setIsLocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        setLocateMessage("Permission denied. Please allow location access in your browser.");
      } else if (err.code === err.TIMEOUT) {
        setLocateMessage("Location request timed out. Try again or manually pin your location on the map.");
      } else {
        setLocateMessage("Unable to get your location while offline. Manually pin your location on the map.");
      }
    };

    setIsLocating(true);
    setLocateMessage("");

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos, false),
      (firstErr) => {
        console.warn(`High-accuracy geolocation failed: [${firstErr.code}] ${firstErr.message}`);

        if (firstErr.code === firstErr.PERMISSION_DENIED) {
          handleFinalError(firstErr);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => applyPosition(pos, true),
          (fallbackErr) => handleFinalError(fallbackErr),
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 1000 * 60 * 60 * 24 * 7,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [fillSelectorsFromCoordinates]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/client/addresses/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("Failed to delete address.");
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== deleteTarget));
      if (selectedAddr?.id === deleteTarget) {
        const remaining = addresses.filter((a) => a.id !== deleteTarget);
        setSelectedAddr(remaining[0] ?? null);
        if (remaining[0]) {
          setPinLat(remaining[0].lat);
          setPinLng(remaining[0].lng);
        }
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      toast.success("Address deleted successfully.");
    } catch {
      toast.error("Failed to delete address.");
    }
  }, [deleteTarget, selectedAddr, addresses]);

  const handleSaveFromSelector = useCallback(async () => {
    if (
      !selectedRegionCode ||
      !selectedProvinceCode ||
      !selectedCityCode ||
      !selectedBarangayCode
    ) {
      setSelectorMessage("Please complete Region, Province, City, and Barangay.");
      return;
    }

    const regionName = getRegionName(selectedRegionCode);
    const provinceName = getProvinceName(selectedProvinceCode);
    const cityName = getCityName(selectedCityCode);
    const barangayName = getBarangayName(selectedBarangayCode);

    const generatedLabel = selectorLabel.trim() || `Address ${addresses.length + 1}`;
    const streetLine = selectorStreet.trim();
    const fullAddress = [
      streetLine,
      barangayName,
      cityName,
      provinceName,
      regionName,
    ]
      .filter(Boolean)
      .join(", ");
    const parsedBill = Number(selectorBill);
    const selectorAppliances: Appliance[] = [
      ...Object.entries(selectedAppliances).map(([name, quantity], idx) => ({
        id: `app-sel-${Date.now()}-${idx}`,
        name,
        quantity,
        wattage: 0,
      })),
      ...otherAppliances.map((item, idx) => ({
        id: `app-other-${Date.now()}-${idx}`,
        name: item.name,
        quantity: item.quantity,
        wattage: 0,
      })),
    ];

    const newAddress: Omit<SavedAddress, "id"> = {
      label: generatedLabel,
      fullAddress,
      city: cityName || "",
      province: provinceName || "",
      zipCode: selectorZipCode.trim() || "0000",
      lat: pinLat,
      lng: pinLng,
      isDefault: addresses.length === 0,
      appliances: selectorAppliances,
      monthlyBill: Number.isFinite(parsedBill) && parsedBill >= 0 ? parsedBill : 0,
    };

    try {
      const response = await fetch("/api/client/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      const payload = (await response.json()) as SavedAddress | { error?: string };
      if (!response.ok) {
        setSelectorMessage(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to save address."
        );
        return;
      }

      const createdAddress = payload as SavedAddress;
      setAddresses((prev) => {
        const updated = createdAddress.isDefault
          ? prev.map((addr) => ({ ...addr, isDefault: false }))
          : prev;
        return [...updated, createdAddress];
      });
      setSelectedAddr(createdAddress);
      setExpandedId(createdAddress.id);
      setSelectorMessage("Address saved successfully.");
    } catch {
      setSelectorMessage("Failed to save address.");
      return;
    }

    // Reset selector fields after successful save
    setSelectorLabel("");
    setSelectorStreet("");
    setSelectorZipCode("");
    setSelectorBill("");
    setSelectedRegionCode("");
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setSelectedBarangayCode("");
    setSelectedAppliances({});
    setOtherAppliances([]);
    setOtherApplianceName("");
    setOtherApplianceQty("1");
  }, [
    selectedRegionCode,
    selectedProvinceCode,
    selectedCityCode,
    selectedBarangayCode,
    selectorLabel,
    selectorStreet,
    selectorZipCode,
    selectorBill,
    selectedAppliances,
    otherAppliances,
    addresses.length,
    pinLat,
    pinLng,
    getRegionName,
    getProvinceName,
    getCityName,
    getBarangayName,
  ]);

  const totalApplianceCount = (appliances: Appliance[]) =>
    appliances.reduce((sum, a) => sum + a.quantity, 0);

  const toggleAppliance = useCallback((name: string) => {
    setSelectedAppliances((prev) => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: 1 };
    });
  }, []);

  const updateApplianceQty = useCallback((name: string, qty: number) => {
    setSelectedAppliances((prev) => ({
      ...prev,
      [name]: Math.max(1, qty),
    }));
  }, []);

  const addOtherAppliance = useCallback(() => {
    const name = otherApplianceName.trim();
    const qty = Math.max(1, Number(otherApplianceQty) || 1);
    if (!name) return;
    setOtherAppliances((prev) => [...prev, { name, quantity: qty }]);
    setOtherApplianceName("");
    setOtherApplianceQty("1");
  }, [otherApplianceName, otherApplianceQty]);

  const removeOtherAppliance = useCallback((idx: number) => {
    setOtherAppliances((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Addresses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your properties, appliances, and electricity details
          </p>
        </div>
        <Button
          icon={MapPinned}
          onClick={() => {
            setShowSavedAddressesModal(true);
            if (addresses.length > 0) {
              setExpandedId(selectedAddr?.id ?? addresses[0].id);
            }
          }}
        >
          My Saved Address
        </Button>
      </div>

      {/* Location map + how-to (left) + scrollable address form (right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)] lg:items-start lg:gap-5">
        <div className="flex flex-col gap-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Map Header */}
            <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                Location Map
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Navigation className="h-3 w-3" />
                  {isLocating ? "Locating…" : "Locate me"}
                </button>
                <span className="text-[10px] text-slate-400">Philippines</span>
              </div>
            </div>

            {/* Interactive Map Area - Leaflet */}
            <DynamicMapView
              addresses={addresses}
              selectedAddr={selectedAddr}
              pinLat={pinLat}
              pinLng={pinLng}
              focusPinKey={focusPinKey}
              focusPinZoom={16}
              onPinChange={(lat, lng) => {
                setPinLat(lat);
                setPinLng(lng);
              }}
              onSelectAddress={selectAddress}
            />

            {/* Coordinates Display */}
            <div className="border-t border-slate-100 px-5 py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    Pinned Location
                  </p>
                  <p className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                    {pinLat.toFixed(4)}°N, {pinLng.toFixed(4)}°E
                  </p>
                  {locateMessage && (
                    <p className="mt-0.5 text-[10px] text-slate-500">{locateMessage}</p>
                  )}
                </div>
                {selectedAddr && (
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                      Address Preview
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-[200px] truncate">
                      {selectedAddr.fullAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-semibold text-slate-600 mb-2">How to use</h4>
            <ul className="space-y-1.5 text-[11px] text-slate-500">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                Open <span className="font-medium text-slate-600">My Saved Address</span> to view
                and manage saved locations
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                Click anywhere on the map to pin a location, then complete the form and save
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                Select an address in the modal to center it on the map
              </li>
            </ul>
          </div>
        </div>

        <div className="min-h-0 min-w-0 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 [scrollbar-gutter:stable] lg:max-h-[calc(100dvh-6rem)]">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
            Address
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Region → Province → City/Municipality → Barangay
            </p>
            {phDataError && (
              <p className="mb-2 text-[11px] text-red-600">{phDataError}</p>
            )}
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Address Label
                </label>
                <input
                  value={selectorLabel}
                  onChange={(e) => setSelectorLabel(e.target.value)}
                  placeholder="Home, Office"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  ZIP Code
                </label>
                <input
                  value={selectorZipCode}
                  onChange={(e) => setSelectorZipCode(e.target.value)}
                  placeholder="1203"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Street / Building
                </label>
                <input
                  value={selectorStreet}
                  onChange={(e) => setSelectorStreet(e.target.value)}
                  placeholder="123 Solar Drive, Brgy. San Antonio"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Region
                </label>
                <select
                  value={selectedRegionCode}
                  onChange={(e) => {
                    setSelectedRegionCode(e.target.value);
                    setSelectedProvinceCode("");
                    setSelectedCityCode("");
                    setSelectedBarangayCode("");
                  }}
                  disabled={isLoadingPhData}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Select region</option>
                  {regions.map((region) => (
                    <option key={region.region_code} value={region.region_code}>
                      {region.region_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Province
                </label>
                <select
                  value={selectedProvinceCode}
                  onChange={(e) => {
                    setSelectedProvinceCode(e.target.value);
                    setSelectedCityCode("");
                    setSelectedBarangayCode("");
                  }}
                  disabled={!selectedRegionCode || isLoadingPhData}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Select province</option>
                  {provinces
                    .filter((p) => p.region_code === selectedRegionCode)
                    .map((province) => (
                      <option
                        key={province.province_code}
                        value={province.province_code}
                      >
                        {province.province_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  City / Municipality
                </label>
                <select
                  value={selectedCityCode}
                  onChange={(e) => {
                    setSelectedCityCode(e.target.value);
                    setSelectedBarangayCode("");
                  }}
                  disabled={!selectedRegionCode || !selectedProvinceCode || isLoadingPhData}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Select city/municipality</option>
                  {cities
                    .filter((city) => city.province_code === selectedProvinceCode)
                    .map((city) => (
                      <option key={city.city_code} value={city.city_code}>
                        {city.city_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  Barangay
                </label>
                <select
                  value={selectedBarangayCode}
                  onChange={(e) => setSelectedBarangayCode(e.target.value)}
                  disabled={
                    !selectedRegionCode ||
                    !selectedProvinceCode ||
                    !selectedCityCode ||
                    isLoadingPhData
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Select barangay</option>
                  {barangays
                    .filter((b) => b.city_code === selectedCityCode)
                    .map((barangay) => (
                      <option key={barangay.brgy_code} value={barangay.brgy_code}>
                        {barangay.brgy_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {(selectedRegionCode ||
              selectedProvinceCode ||
              selectedCityCode ||
              selectedBarangayCode) && (
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Preview:</span>{" "}
                {[
                  getBarangayName(selectedBarangayCode),
                  getCityName(selectedCityCode),
                  getProvinceName(selectedProvinceCode),
                  getRegionName(selectedRegionCode),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                Average Monthly Meralco Bill (PHP)
              </label>
              <input
                type="number"
                min="0"
                value={selectorBill}
                onChange={(e) => setSelectorBill(e.target.value)}
                placeholder="5500"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 p-3">
              <h5 className="text-xs font-semibold text-slate-700 mb-2">
                Appliances Selection
              </h5>
              <p className="text-[11px] text-slate-500 mb-3">
                Select household appliances and set quantity. Use &quot;Other&quot; if missing.
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {applianceOptions.map((name) => {
                  const selected = Boolean(selectedAppliances[name]);
                  return (
                    <div
                      key={name}
                      className={`rounded-lg border px-2.5 py-2 ${
                        selected ? "border-brand/40 bg-brand-50/40" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleAppliance(name)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand"
                          />
                          {name}
                        </label>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            value={selectedAppliances[name]}
                            onChange={(e) =>
                              updateApplianceQty(name, Number(e.target.value) || 1)
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-2.5">
                <p className="text-[11px] font-medium text-slate-600 mb-2">Other appliance</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={otherApplianceName}
                    onChange={(e) => setOtherApplianceName(e.target.value)}
                    placeholder="Appliance name"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <input
                    type="number"
                    min="1"
                    value={otherApplianceQty}
                    onChange={(e) => setOtherApplianceQty(e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={addOtherAppliance}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                  >
                    Add Other
                  </button>
                </div>

                {otherAppliances.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {otherAppliances.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5"
                      >
                        <span className="text-xs text-slate-700">
                          {item.name} (Qty: {item.quantity})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOtherAppliance(idx)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p
                className={`text-xs ${
                  selectorMessage.includes("successfully")
                    ? "text-green-600"
                    : "text-slate-500"
                }`}
              >
                {selectorMessage || "Fill the selector and save as a new address."}
              </p>
              <Button
                size="sm"
                onClick={handleSaveFromSelector}
                disabled={
                  !selectedRegionCode ||
                  !selectedProvinceCode ||
                  !selectedCityCode ||
                  !selectedBarangayCode
                }
              >
                Save Address
              </Button>
            </div>
        </div>
      </div>

      {/* My Saved Addresses — opened from header */}
      <Modal
        isOpen={showSavedAddressesModal}
        onClose={() => setShowSavedAddressesModal(false)}
        title="My Saved Addresses"
        size="lg"
      >
        <div className="space-y-4">
          {addresses.map((addr) => {
            const expanded = expandedId === addr.id;
            const isSelected = selectedAddr?.id === addr.id;

            return (
              <div
                key={addr.id}
                className={`rounded-2xl border-2 bg-white shadow-sm transition-all ${
                  isSelected
                    ? "border-brand ring-1 ring-brand/15"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectAddress(addr)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectAddress(addr);
                    }
                  }}
                  className="flex w-full items-start gap-3 p-5 text-left cursor-pointer"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {addressIcons[addr.label] ?? <MapPin className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {addr.label}
                      </h3>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand">
                          <Star className="h-2.5 w-2.5 fill-brand" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      {addr.fullAddress}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-slate-400" />
                        {totalApplianceCount(addr.appliances)} appliance
                        {totalApplianceCount(addr.appliances) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Receipt className="h-3 w-3 text-slate-400" />
                        {formatCurrency(addr.monthlyBill)}/mo
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expanded ? null : addr.id);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 px-5 pb-5">
                    <div className="mt-4">
                      <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Household Appliances
                      </h4>
                      <div className="space-y-1.5">
                        {addr.appliances.length === 0 ? (
                          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            No appliances added
                          </div>
                        ) : (
                          addr.appliances.map((app) => (
                            <div
                              key={app.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <span className="text-xs font-medium text-slate-700">
                                {app.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Qty: {app.quantity}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Receipt className="h-3.5 w-3.5 text-blue-500" />
                        Average Monthly Meralco Bill
                      </h4>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(addr.monthlyBill)}
                        </span>
                        <span className="text-[10px] text-slate-400">per month</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                      <Navigation className="h-3 w-3" />
                      <span>
                        {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultTargetId(addr.id);
                            setShowSetDefaultConfirm(true);
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:min-w-[140px]"
                        >
                          <Star className="h-3 w-3" />
                          Set as Default
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:min-w-0"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(addr.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 sm:min-w-0"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {addresses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No addresses saved</p>
              <p className="mt-1 text-xs text-slate-500">
                Use the form beside the map to add your first address.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Set Default Confirmation */}
      <ConfirmModal
        isOpen={showSetDefaultConfirm}
        onClose={() => {
          setShowSetDefaultConfirm(false);
          setDefaultTargetId(null);
        }}
        onConfirm={async () => {
          if (defaultTargetId) await handleSetDefault(defaultTargetId);
        }}
        title="Set as Default"
        message={
          defaultTargetId ? (
            <>
              Are you sure you want to set this address as your default? It will
              be used for new bookings and service requests.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Set as Default"
        variant="primary"
        isLoading={setDefaultSubmitting}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        title="Delete Address"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this address? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
