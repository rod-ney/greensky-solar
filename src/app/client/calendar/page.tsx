"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import type { Booking, TimeSlot } from "@/types/client";
import type { BookingStatus } from "@/types/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusDots: Record<BookingStatus, string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  completed: "bg-slate-400",
  cancelled: "bg-red-400",
  in_progress: "bg-blue-500",
};

export default function ClientCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const today = new Date();
  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookingsResponse, slotsResponse] = await Promise.all([
          fetch("/api/client/bookings", { cache: "no-store" }),
          fetch("/api/client/time-slots", { cache: "no-store" }),
        ]);
        if (bookingsResponse.ok) {
          setBookings((await bookingsResponse.json()) as Booking[]);
        }
        if (slotsResponse.ok) {
          setTimeSlots((await slotsResponse.json()) as TimeSlot[]);
        }
      } catch {
        setBookings([]);
        setTimeSlots([]);
      }
    };
    void loadData();
  }, []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getBookingsForDate = (day: number) =>
    bookings.filter((b) => b.date === dateStr(day));

  const hasBooking = (day: number) => getBookingsForDate(day).length > 0;

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const isWeekend = (day: number) => {
    const dow = new Date(year, month, day).getDay();
    return dow === 0; // Sundays unavailable
  };

  const selectedBookings = selectedDate
    ? bookings.filter((b) => b.date === selectedDate)
    : [];

  const navigateMonth = (dir: -1 | 1) => {
    const m = month + dir;
    if (m < 0) { setMonth(11); setYear(year - 1); }
    else if (m > 11) { setMonth(0); setYear(year + 1); }
    else setMonth(m);
    setSelectedDate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View available dates, scheduled bookings, and plan your appointments
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          {/* Nav */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth());
                  setSelectedDate(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Today
              </button>
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

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d) => (
              <div key={d} className="px-1 py-2.5 text-center text-xs font-medium text-slate-400">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null)
                return <div key={`e-${idx}`} className="h-20 border-b border-r border-slate-50" />;

              const ds = dateStr(day);
              const bks = getBookingsForDate(day);
              const past = isPast(day);
              const weekend = isWeekend(day);
              const sel = selectedDate === ds;
              const tod = isToday(day);
              const available = !past && !weekend;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(sel ? null : ds)}
                  className={`relative h-20 border-b border-r border-slate-50 p-1.5 text-left transition-colors ${
                    sel
                      ? "bg-brand-50"
                      : past
                      ? "bg-slate-50/50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      tod
                        ? "bg-brand text-white"
                        : sel
                        ? "text-brand font-bold"
                        : past
                        ? "text-slate-300"
                        : weekend
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>

                  {/* Availability indicator */}
                  {!past && !weekend && bks.length === 0 && (
                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-green-400" />
                    </div>
                  )}

                  {/* Booking dots */}
                  {bks.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {bks.slice(0, 3).map((b) => (
                        <span
                          key={b.id}
                          className={`h-1.5 w-1.5 rounded-full ${statusDots[b.status]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-[11px] text-slate-500">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[11px] text-slate-500">Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] text-slate-500">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[11px] text-slate-500">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-500">Unavailable</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Info */}
          {selectedDate ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>

              {selectedBookings.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-slate-500">
                    Scheduled ({selectedBookings.length})
                  </p>
                  {selectedBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="rounded-xl border border-slate-100 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          {bk.referenceNo}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            statusDots[bk.status].replace("bg-", "border-").replace("500", "200") +
                            " " +
                            statusDots[bk.status].replace("bg-", "text-").replace("500", "700").replace("400", "600")
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${statusDots[bk.status]}`} />
                          {BOOKING_STATUS_LABELS[bk.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {bk.time}
                      </div>
                      <p className="text-xs text-slate-600">{bk.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  {isPast(parseInt(selectedDate.split("-")[2])) ? (
                    <p className="text-xs text-slate-400">This date has passed.</p>
                  ) : isWeekend(parseInt(selectedDate.split("-")[2])) ? (
                    <p className="text-xs text-slate-400">
                      Not available on Sundays.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-green-600 mb-3">
                        <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />
                        Available for booking
                      </p>
                      <p className="text-xs text-slate-500 mb-3">Select a time slot:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              slot.available
                                ? "border-slate-200 text-slate-700 hover:border-brand hover:bg-brand-50 hover:text-brand"
                                : "border-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col items-center py-6 text-center">
                <Calendar className="h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  Select a date
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click on a date to view bookings or available time slots
                </p>
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Upcoming Bookings
            </h3>
            <div className="space-y-3">
              {bookings
                .filter(
                  (b) =>
                    (b.status === "confirmed" || b.status === "pending") &&
                    new Date(b.date) >= new Date()
                )
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .slice(0, 4)
                .map((bk) => (
                  <button
                    key={bk.id}
                    onClick={() => setSelectedDate(bk.date)}
                    className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col items-center rounded-lg bg-brand-50 px-2 py-1.5 min-w-[44px]">
                      <span className="text-[10px] font-medium text-brand">
                        {new Date(bk.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-base font-bold text-brand">
                        {new Date(bk.date).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {bk.notes.split(" - ")[0]}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {bk.time} · {bk.technician}
                      </p>
                    </div>
                    <span className={`mt-1 h-2 w-2 rounded-full ${statusDots[bk.status]}`} />
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
