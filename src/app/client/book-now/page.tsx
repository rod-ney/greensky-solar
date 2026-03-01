"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { getTodayInManila, isPastDateTime } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import { SERVICE_OPTIONS } from "@/lib/constants";
import type { SavedAddress, ServiceType, TimeSlot, Booking } from "@/types/client";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const steps = [
  { title: "Saved Address", icon: MapPin },
  { title: "Calendar", icon: Calendar },
  { title: "Date Picker", icon: Clock },
  { title: "Review", icon: ClipboardCheck },
];

export default function BookNowPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const today = new Date();

  const [currentStep, setCurrentStep] = useState(1);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [selectedAddressId, setSelectedAddressId] = useState(savedAddresses[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("site_inspection");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookingsResponse, addressesResponse, slotsResponse] = await Promise.all([
          fetch("/api/client/bookings", { cache: "no-store" }),
          fetch("/api/client/addresses", { cache: "no-store" }),
          fetch("/api/client/time-slots", { cache: "no-store" }),
        ]);
        if (bookingsResponse.ok) {
          setBookings((await bookingsResponse.json()) as Booking[]);
        }
        if (addressesResponse.ok) {
          const addresses = (await addressesResponse.json()) as SavedAddress[];
          setSavedAddresses(addresses);
          if (addresses.length > 0) {
            setSelectedAddressId(addresses[0].id);
          }
        }
        if (slotsResponse.ok) {
          setTimeSlots((await slotsResponse.json()) as TimeSlot[]);
        }
      } catch {
        setBookings([]);
        setSavedAddresses([]);
        setTimeSlots([]);
      }
    };
    void loadData();
  }, []);

  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);
  const selectedService = SERVICE_OPTIONS.find((s) => s.value === serviceType)?.label ?? "";

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDay, daysInMonth]);

  const makeDateString = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isPastDate = (dateString: string) => {
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const isDateBooked = (dateString: string) =>
    bookings.some((b) => b.date === dateString && (b.status === "confirmed" || b.status === "pending"));

  const todayStr = getTodayInManila();
  const availableTimeSlots = timeSlots
    .filter((slot) => slot.available)
    .filter(
      (slot) =>
        selectedDate !== todayStr || !isPastDateTime(selectedDate, slot.time)
    );

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const slotsForNewDate = timeSlots
      .filter((slot) => slot.available)
      .filter(
        (slot) =>
          newDate !== todayStr || !isPastDateTime(newDate, slot.time)
      );
    if (!slotsForNewDate.some((s) => s.time === selectedTime)) {
      setSelectedTime("");
    }
  };

  const canContinue =
    (currentStep === 1 && Boolean(selectedAddressId)) ||
    (currentStep === 2 && Boolean(selectedDate)) ||
    (currentStep === 3 && Boolean(selectedDate && selectedTime && serviceType)) ||
    currentStep === 4;

  const goNext = () => setCurrentStep((prev) => Math.min(4, prev + 1));
  const goBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const navigateMonth = (direction: -1 | 1) => {
    const next = month + direction;
    if (next < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else if (next > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth(next);
    }
  };

  const submitBooking = async () => {
    if (!selectedAddress || !selectedDate || !selectedTime) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idempotencyKeyRef.current) {
        headers["Idempotency-Key"] = idempotencyKeyRef.current;
      }
      const response = await fetch("/api/client/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          serviceType,
          date: selectedDate,
          time: selectedTime,
          address: selectedAddress.fullAddress,
          notes: notes.trim(),
          status: "pending",
          technician: "Unassigned",
          amount: 0,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
          addressId: selectedAddress.id,
        }),
      });
      const payload = (await response.json()) as Booking | { error?: string };
      if (!response.ok) {
        toast.error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to create booking."
        );
        return;
      }
      setBookings((prev) => [payload as Booking, ...prev]);
      setIsSubmitted(true);
      setShowConfirmModal(false);
      setCurrentStep(4);
      toast.success("Booking confirmed! Our team will confirm your schedule shortly.");
    } catch {
      toast.error("Failed to create booking.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Book Now</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Complete the stepper to schedule your next service appointment.
        </p>
      </div>

      {/* Stepper */}
      <div className="px-1 py-2 sm:px-2">
        <div className="relative">
          {/* Base line */}
          <div className="absolute left-[12.5%] right-[12.5%] top-4 h-[2px] bg-slate-300" />
          {/* Progress line */}
          <div
            className="absolute left-[12.5%] right-[12.5%] top-4 h-[2px] origin-left bg-brand transition-transform"
            style={{ transform: `scaleX(${(currentStep - 1) / (steps.length - 1)})` }}
          />

          <div className="relative grid grid-cols-4">
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const active = currentStep === stepNum;
              const done = currentStep > stepNum || (isSubmitted && stepNum === 4);

              return (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                      done
                        ? "border-brand bg-brand text-white"
                        : active
                        ? "border-blue-500 bg-white text-blue-500 ring-2 ring-blue-200"
                        : "border-slate-300 bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
                  </div>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Step {stepNum}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      active ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">1. Select Saved Address</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {savedAddresses.map((address) => {
                const selected = selectedAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-brand bg-brand-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{address.label}</p>
                      {address.isDefault && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{address.fullAddress}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">2. Select Date from Calendar</h2>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {MONTHS[month]} {year}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DAYS.map((d) => (
                  <div key={d} className="py-2 text-center text-[11px] font-medium text-slate-400">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="h-16 border-r border-b border-slate-50" />;
                  const date = makeDateString(day);
                  const selected = selectedDate === date;
                  const past = isPastDate(date);
                  const booked = isDateBooked(date);
                  const disabled = past;
                  return (
                    <button
                      key={date}
                      disabled={disabled}
                      onClick={() => handleDateChange(date)}
                      className={`relative h-16 border-r border-b border-slate-50 text-sm ${
                        disabled
                          ? "text-slate-300 bg-slate-50/40 cursor-not-allowed"
                          : selected
                          ? "bg-brand-50 text-brand font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {day}
                      {!disabled && (
                        <span
                          className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${
                            booked ? "bg-amber-500" : "bg-green-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Green dot: more available slots · Amber dot: high demand
            </p>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">3. Date Picker & Time Selection</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Selected Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  {SERVICE_OPTIONS.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600">Choose Time Slot</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availableTimeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      selectedTime === slot.time
                        ? "border-brand bg-brand-50 text-brand"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add booking notes (e.g. preferred technician, access instructions)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">4. Review Booking</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Address</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedAddress?.label || "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedAddress?.fullAddress || "No address selected"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Date & Time</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedDate ? formatDate(selectedDate) : "—"} {selectedTime ? `at ${selectedTime}` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Service Type</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selectedService || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{notes || "No notes provided"}</p>
              </div>
            </div>

            {isSubmitted && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Booking submitted successfully. Our team will confirm your schedule shortly.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStep === 1}>
          Back
        </Button>
        {currentStep < 4 ? (
          <Button onClick={goNext} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => {
              idempotencyKeyRef.current = crypto.randomUUID();
              setShowConfirmModal(true);
            }}
            disabled={isSubmitted || !selectedAddressId || !selectedDate || !selectedTime}
          >
            {isSubmitted ? "Submitted" : "Confirm Booking"}
          </Button>
        )}
      </div>

      {/* Confirm Booking Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Booking"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to confirm this booking? Your appointment will be scheduled for{" "}
            <span className="font-semibold text-slate-900">
              {selectedDate ? formatDate(selectedDate) : ""} at {selectedTime}
            </span>
            {selectedAddress && (
              <>
                {" "}
                at <span className="font-semibold text-slate-900">{selectedAddress.label}</span>
              </>
            )}
            .
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitBooking}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

