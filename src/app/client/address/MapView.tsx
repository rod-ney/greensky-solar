"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { SavedAddress } from "@/types/client";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  addresses: SavedAddress[];
  selectedAddr: SavedAddress | null;
  pinLat: number;
  pinLng: number;
  onPinChange: (lat: number, lng: number) => void;
  onSelectAddress: (addr: SavedAddress) => void;
  focusPinKey?: number;
  focusPinZoom?: number;
}

function ClickHandler({ onPinChange }: { onPinChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function FocusOnPin({
  lat,
  lng,
  focusKey,
  zoom,
}: {
  lat: number;
  lng: number;
  focusKey: number;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!focusKey) return;
    map.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
  }, [map, lat, lng, zoom, focusKey]);
  return null;
}

export default function MapView({
  addresses,
  selectedAddr,
  pinLat,
  pinLng,
  onPinChange,
  onSelectAddress,
  focusPinKey = 0,
  focusPinZoom = 16,
}: MapViewProps) {
  const center = useMemo<[number, number]>(() => {
    if (selectedAddr) return [selectedAddr.lat, selectedAddr.lng];
    return [pinLat || 14.5547, pinLng || 121.0244]; // Metro Manila fallback
  }, [selectedAddr, pinLat, pinLng]);

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={true}
      style={{ height: 400, width: "100%" }}
      className="relative z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Zoom in + center when requested (e.g. Locate me) */}
      <FocusOnPin
        lat={pinLat}
        lng={pinLng}
        focusKey={focusPinKey}
        zoom={focusPinZoom}
      />

      {/* Allow clicking on the map to move the pin */}
      <ClickHandler onPinChange={onPinChange} />

      {/* Saved addresses as subtle markers */}
      {addresses.map((addr) => {
        const isSelected = selectedAddr?.id === addr.id;
        return (
          <CircleMarker
            key={addr.id}
            center={[addr.lat, addr.lng]}
            radius={isSelected ? 10 : 6}
            pathOptions={{
              color: isSelected ? "#0f766e" : "#64748b",
              fillColor: isSelected ? "#14b8a6" : "#cbd5f5",
              fillOpacity: 0.9,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{
              click: () => onSelectAddress(addr),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
              <div className="text-xs font-medium text-slate-900">{addr.label}</div>
              <div className="text-[10px] text-slate-600 max-w-[180px]">
                {addr.fullAddress}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Current draggable-style pin */}
      <CircleMarker
        center={[pinLat, pinLng]}
        radius={8}
        pathOptions={{
          color: "#0f766e",
          fillColor: "#22c55e",
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
          <div className="text-[10px] text-slate-800 font-medium">
            Pinned Location
            <br />
            {pinLat.toFixed(4)}° N, {pinLng.toFixed(4)}° E
          </div>
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}

