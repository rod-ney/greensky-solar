"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Edit2, Trash2, Filter, CalendarDays, Clock, MapPin, Navigation, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { SERVICE_LABELS, BOOKING_STATUS_OPTIONS } from "@/lib/constants";
import type { Booking, BookingStatus } from "@/types/client";

export default function BookingsPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await fetch("/api/bookings", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Booking[];
        setAllBookings(data);
      } catch {
        setAllBookings([]);
      }
    };
    void loadBookings();
  }, []);


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSaveBookingConfirm, setShowSaveBookingConfirm] = useState(false);
  const [saveBookingSubmitting, setSaveBookingSubmitting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const [loadingDirectionsId, setLoadingDirectionsId] = useState<string | null>(null);

  const openLocation = async (booking: Booking) => {
    // Use client's pinned coordinates when available — opens map with pin at exact lat/lng
    if (typeof booking.lat === "number" && typeof booking.lng === "number") {
      window.open(
        `https://www.google.com/maps?q=${booking.lat},${booking.lng}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }
    // Fallback: geocode address to get coordinates, then show pin
    const addr = booking.address?.trim();
    if (!addr) return;
    setLoadingDirectionsId(booking.id);
    const query = addr.toLowerCase().includes("philippines") ? addr : `${addr}, Philippines`;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "GreenSkySolar/1.0 (admin-directions)" } }
      );
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (data?.[0]?.lat != null && data?.[0]?.lon != null) {
        window.open(
          `https://www.google.com/maps?q=${data[0].lat},${data[0].lon}`,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setLoadingDirectionsId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        b.referenceNo.toLowerCase().includes(q) ||
        b.technician.toLowerCase().includes(q) ||
        (b.projectLead?.toLowerCase().includes(q) ?? false) ||
        b.address.toLowerCase().includes(q) ||
        b.notes.toLowerCase().includes(q) ||
        SERVICE_LABELS[b.serviceType].toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allBookings, search, statusFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      total: allBookings.length,
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    allBookings.forEach((b) => {
      map[b.status] = (map[b.status] || 0) + 1;
    });
    return map;
  }, [allBookings]);

  const summaryCards = [
    { label: "Total", value: counts.total, color: "bg-slate-50 border-slate-200 text-slate-900" },
    { label: "Pending", value: counts.pending, color: "bg-amber-50 border-amber-200 text-amber-700", filter: "pending" as BookingStatus },
    { label: "Confirmed", value: counts.confirmed, color: "bg-emerald-50 border-emerald-200 text-emerald-700", filter: "confirmed" as BookingStatus },
    { label: "In Progress", value: counts.in_progress, color: "bg-blue-50 border-blue-200 text-blue-700", filter: "in_progress" as BookingStatus },
    { label: "Completed", value: counts.completed, color: "bg-green-50 border-green-200 text-green-700", filter: "completed" as BookingStatus },
    { label: "Cancelled", value: counts.cancelled, color: "bg-red-50 border-red-200 text-red-700", filter: "cancelled" as BookingStatus },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View and manage all client service bookings
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            onClick={() =>
              setStatusFilter(
                card.filter
                  ? statusFilter === card.filter
                    ? "all"
                    : card.filter
                  : "all"
              )
            }
            className={`rounded-xl border p-3 text-left transition-all ${
              (card.filter && statusFilter === card.filter) ||
              (!card.filter && statusFilter === "all")
                ? "ring-1 ring-brand/30 border-brand"
                : ""
            } ${card.color}`}
          >
            <p className="text-xs font-medium opacity-70">{card.label}</p>
            <p className="mt-1 text-lg font-bold">{card.value}</p>
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {BOOKING_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Reference
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Service
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden md:table-cell">
                  Schedule
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden lg:table-cell">
                  Technician
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 hidden xl:table-cell">
                  Address
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 hidden sm:table-cell">
                  Amount
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-sm text-slate-400">No bookings found</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Reference */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-brand">
                        {booking.referenceNo}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900">
                        {SERVICE_LABELS[booking.serviceType]}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {booking.notes}
                      </p>
                    </td>

                    {/* Schedule */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(booking.date)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={booking.status} />
                    </td>

                    {/* Technician / Project Lead */}
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">
                        {booking.projectLead ?? booking.technician}
                      </span>
                      {booking.projectLead && (
                        <p className="text-xs text-slate-400 mt-0.5">Project Lead</p>
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 max-w-[200px]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{booking.address}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-sm font-medium text-slate-900">
                        {booking.amount > 0
                          ? formatCurrency(booking.amount)
                          : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {booking.address?.trim() ? (
                          <button
                            onClick={() => openLocation(booking)}
                            disabled={loadingDirectionsId === booking.id}
                            title="Get Location"
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-70"
                          >
                            {loadingDirectionsId === booking.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Navigation className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowEditModal(true);
                          }}
                          title="Edit booking"
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDeleteModal(true);
                          }}
                          title="Delete booking"
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table footer info */}
      <div className="text-xs text-slate-400 text-right">
        Showing {filteredBookings.length} of {allBookings.length} bookings
      </div>

      {/* Confirm Save Booking */}
      <ConfirmModal
        isOpen={showSaveBookingConfirm}
        onClose={() => setShowSaveBookingConfirm(false)}
        onConfirm={async () => {
          if (!selectedBooking || !editFormRef.current) return;
          const formData = new FormData(editFormRef.current);
          setSaveBookingSubmitting(true);
          try {
            const response = await fetch(
              `/api/client/bookings/${selectedBooking.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  serviceType: formData.get("serviceType"),
                  status: formData.get("status"),
                  date: formData.get("date"),
                  time: formData.get("time"),
                  technician: formData.get("technician"),
                  address: formData.get("address"),
                  notes: formData.get("notes"),
                  amount: Number(formData.get("amount") ?? 0),
                  ...(String(formData.get("address")).trim() !== selectedBooking.address?.trim()
                    ? { lat: null, lng: null, addressId: null }
                    : {}),
                }),
              }
            );
            const payload = (await response.json()) as Booking | { error?: string };
            if (!response.ok) {
              toast.error("Failed to update booking.");
              setSaveBookingSubmitting(false);
              return;
            }
            const updated = payload as Booking;
            setAllBookings((prev) =>
              prev.map((booking) =>
                booking.id === updated.id ? updated : booking
              )
            );
            setShowEditModal(false);
            setSelectedBooking(null);
            setShowSaveBookingConfirm(false);
            toast.success("Booking updated successfully.");
          } catch {
            toast.error("Failed to update booking.");
          } finally {
            setSaveBookingSubmitting(false);
          }
        }}
        title="Save Changes"
        message={
          selectedBooking ? (
            <>
              Are you sure you want to save changes to booking{" "}
              <span className="font-semibold text-slate-900">{selectedBooking.referenceNo}</span>?
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Save Changes"
        variant="primary"
        isLoading={saveBookingSubmitting}
      />

      {/* Edit Booking Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBooking(null);
        }}
        title="Edit Booking"
        size="lg"
      >
        {selectedBooking && (
          <form
            ref={editFormRef}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedBooking) return;
              setShowSaveBookingConfirm(true);
            }}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <span className="font-semibold text-brand">
                {selectedBooking.referenceNo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service Type
                </label>
                <select
                  name="serviceType"
                  defaultValue={selectedBooking.serviceType}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={selectedBooking.status}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  {BOOKING_STATUS_OPTIONS
                    .filter((o) => o.value !== "all")
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  name="date"
                  type="date"
                  defaultValue={selectedBooking.date}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  name="time"
                  type="text"
                  defaultValue={selectedBooking.time}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Technician
              </label>
              <input
                name="technician"
                type="text"
                defaultValue={selectedBooking.technician}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <input
                name="address"
                type="text"
                defaultValue={selectedBooking.address}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                defaultValue={selectedBooking.notes}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount (PHP)
              </label>
              <input
                name="amount"
                type="number"
                defaultValue={selectedBooking.amount}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedBooking(null);
        }}
        title="Delete Booking"
        size="xs"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete booking{" "}
              <span className="font-semibold text-slate-900">
                {selectedBooking.referenceNo}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!selectedBooking) return;
                  try {
                    const response = await fetch(
                      `/api/client/bookings/${selectedBooking.id}`,
                      { method: "DELETE" }
                    );
                    if (!response.ok) {
                      toast.error("Failed to delete booking.");
                      return;
                    }
                    setAllBookings((prev) =>
                      prev.filter((booking) => booking.id !== selectedBooking.id)
                    );
                    setShowDeleteModal(false);
                    setSelectedBooking(null);
                    toast.success("Booking deleted successfully.");
                  } catch {
                    toast.error("Failed to delete booking.");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
