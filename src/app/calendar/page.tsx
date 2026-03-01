"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import type { CalendarEvent } from "@/types";
import type { Booking } from "@/types/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const eventTypeColors: Record<string, string> = {
  installation: "bg-green-500",
  inspection: "bg-blue-500",
  maintenance_repair: "bg-amber-500",
  cleaning: "bg-purple-500",
  inverter_battery_setup: "bg-red-500",
};

const eventTypeLabels: Record<string, string> = {
  installation: "Installation",
  inspection: "Inspection",
  maintenance_repair: "Maintenance and Repair",
  cleaning: "Cleaning",
  inverter_battery_setup: "Inverter and Battery Setup",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const today = new Date();
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const [eventsResponse, bookingsResponse] = await Promise.all([
          fetch("/api/calendar/events", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
        ]);
        const events = eventsResponse.ok
          ? ((await eventsResponse.json()) as CalendarEvent[])
          : [];
        const bookings = bookingsResponse.ok
          ? ((await bookingsResponse.json()) as Booking[])
          : [];

        const bookingToEventType = (
          serviceType: Booking["serviceType"]
        ): CalendarEvent["type"] => {
          if (serviceType === "site_inspection") return "inspection";
          if (serviceType === "solar_panel_installation") return "installation";
          if (serviceType === "inverter_battery_setup") return "inverter_battery_setup";
          if (serviceType === "maintenance_repair") return "maintenance_repair";
          if (serviceType === "cleaning") return "cleaning";
          return "installation";
        };

        const bookingEvents: CalendarEvent[] = bookings.map((booking) => {
          const mappedType = bookingToEventType(booking.serviceType);
          return {
            id: `booking-${booking.id}`,
            title: `Booking ${booking.referenceNo}`,
            date: booking.date,
            type: mappedType,
            projectName: booking.address,
            color: eventTypeColors[mappedType],
          };
        });

        setCalendarEvents([...events, ...bookingEvents]);
      } catch {
        setCalendarEvents([]);
      }
    };
    void loadEvents();
  }, []);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter((e) => e.date === dateStr);
  };

  const selectedDateEvents = selectedDate
    ? calendarEvents.filter((e) => e.date === selectedDate)
    : [];

  const navigateMonth = (direction: -1 | 1) => {
    const newMonth = currentMonth + direction;
    if (newMonth < 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else if (newMonth > 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(newMonth);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(null);
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const isSelected = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return selectedDate === dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View project schedules, installations, and service events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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

          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="border-b border-r border-slate-100 p-2 h-24" />;
              }
              const events = getEventsForDate(day);
              return (
                <button
                  key={day}
                  onClick={() => {
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    setSelectedDate(selectedDate === dateStr ? null : dateStr);
                  }}
                  className={`relative border-b border-r border-slate-100 p-2 h-24 text-left transition-colors hover:bg-slate-50 ${
                    isSelected(day) ? "bg-brand-50" : ""
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday(day)
                        ? "bg-brand text-white"
                        : isSelected(day)
                        ? "text-brand font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {events.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center gap-1 rounded px-1 py-0.5"
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${eventTypeColors[evt.type]}`}
                          />
                          <span className="text-[10px] text-slate-600 truncate">
                            {evt.title.length > 18 ? evt.title.slice(0, 18) + "…" : evt.title}
                          </span>
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[10px] text-slate-400 pl-1">
                          +{events.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Selected Date Events + Legend */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Event Types</h3>
            <div className="space-y-2">
              {Object.entries(eventTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-slate-600">{eventTypeLabels[type] ?? type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              {selectedDateEvents.length === 0 ? (
                <p className="text-xs text-slate-500">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${eventTypeColors[evt.type]}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900">
                            {evt.title}
                          </p>
                          {evt.projectName && (
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {evt.projectName}
                            </p>
                          )}
                          <span className="inline-flex mt-1 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                            {eventTypeLabels[evt.type] ?? evt.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming</h3>
            <div className="space-y-3">
              {calendarEvents
                .filter((e) => new Date(e.date) >= today)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2.5">
                    <div
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${eventTypeColors[evt.type]}`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {evt.title}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(evt.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
