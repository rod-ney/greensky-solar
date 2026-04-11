"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  PlusCircle,
  Sun,
  ArrowRight,
  Zap,
  Clock,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import type { Booking, Payment } from "@/types/client";
import { useSessionUser } from "@/lib/client-session";

export default function ClientHomePage() {
  const sessionUser = useSessionUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [warrantyProjectCount, setWarrantyProjectCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookingsResponse, paymentsResponse, projectsResponse] = await Promise.all([
          fetch("/api/client/bookings", { cache: "no-store" }),
          fetch("/api/client/payments", { cache: "no-store" }),
          fetch("/api/client/projects", { cache: "no-store" }),
        ]);
        if (bookingsResponse.ok) {
          setBookings((await bookingsResponse.json()) as Booking[]);
        }
        if (paymentsResponse.ok) {
          setPayments((await paymentsResponse.json()) as Payment[]);
        }
        if (projectsResponse.ok) {
          const projects = (await projectsResponse.json()) as unknown[];
          setWarrantyProjectCount(projects.length);
          setProjectCount(projects.length);
        }
      } catch {
        setBookings([]);
        setPayments([]);
        setWarrantyProjectCount(0);
      }
    };
    void load();
  }, []);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isUpcoming = useCallback(
    (b: Booking) => {
      if (b.status === "completed" || b.status === "cancelled") return false;
      const bookingDate = new Date(b.date);
      bookingDate.setHours(0, 0, 0, 0);
      return (b.status === "confirmed" || b.status === "pending" || b.status === "in_progress") && bookingDate >= todayStart;
    },
    [todayStart]
  );

  const navCards = useMemo(
    () => [
      {
        label: "Book Now",
        description: "Create a new booking in a guided step-by-step flow",
        href: "/client/book-now",
        icon: PlusCircle,
        color: "bg-emerald-600",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        stat: "Quick booking",
      },
      {
        label: "Booking",
        description: "Schedule and manage your service appointments",
        href: "/client/booking",
        icon: CalendarCheck,
        color: "bg-brand",
        iconBg: "bg-brand/10",
        iconColor: "text-brand",
        stat: `${bookings.filter(isUpcoming).length} upcoming`,
      },
      {
        label: "My Projects",
        description: "Track your solar installation projects and detailed timeline",
        href: "/client/projects",
        icon: ClipboardList,
        color: "bg-indigo-600",
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-600",
        stat: `${projectCount} project${projectCount !== 1 ? "s" : ""}`,
      },
      {
        label: "Calendar",
        description: "View available dates and scheduled bookings",
        href: "/client/calendar",
        icon: Calendar,
        color: "bg-blue-600",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        stat: "View schedule",
      },
      {
        label: "Address",
        description: "Manage your properties and appliance details",
        href: "/client/address",
        icon: MapPin,
        color: "bg-orange-500",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        stat: "Saved addresses",
      },
      {
        label: "Payments",
        description: "Track your invoices and payment history",
        href: "/client/payments",
        icon: CreditCard,
        color: "bg-purple-600",
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
        stat: `${payments.filter((p) => p.status === "pending").length} pending`,
      },
      {
        label: "Documents",
        description: "Access contracts, warranties, and reports",
        href: "/client/documents",
        icon: FileText,
        color: "bg-teal-600",
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        stat: "View files",
      },
      {
        label: "Warranty & Support",
        description: "View completed projects under warranty and report any issues",
        href: "/client/warranty",
        icon: ShieldCheck,
        color: "bg-amber-600",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        stat: `${warrantyProjectCount} project${warrantyProjectCount !== 1 ? "s" : ""} under warranty`,
      },
    ],
    [bookings, payments, warrantyProjectCount, projectCount, isUpcoming]
  );

  const nextBooking = bookings.find(
    (b) => b.status === "confirmed" && new Date(b.date) >= todayStart
  );
  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(isUpcoming).length;
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalBilled = payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentProgressPercent =
    totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-emerald-700 p-6 sm:p-8 text-white">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70">Welcome back,</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{sessionUser.name}</h1>
          <p className="mt-2 text-sm text-white/80 max-w-md">
            Manage your solar energy services, track bookings, and keep your system running at peak performance.
          </p>

          {nextBooking && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3">
              <Clock className="h-4 w-4 text-white/80" />
              <div>
                <p className="text-xs text-white/70">Next appointment</p>
                <p className="text-sm font-semibold">
                  {new Date(nextBooking.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {nextBooking.time} — {nextBooking.notes.split(" - ")[0]}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-10 h-20 w-20 rounded-full bg-white/5" />
        <div className="absolute right-16 -bottom-8 h-24 w-24 rounded-full bg-white/5" />
        <Sun className="absolute right-8 top-8 h-16 w-16 text-white/10" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
            <Zap className="h-4 w-4 text-brand" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{upcomingBookings}</p>
          <p className="text-[11px] text-slate-500">Upcoming Bookings</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{totalBookings}</p>
          <p className="text-[11px] text-slate-500">Total Bookings</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <CreditCard className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{paymentProgressPercent}%</p>
          <p className="text-[11px] text-slate-500">Payments Settled</p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-brand transition-colors">
                  {card.label}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {card.description}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-400">
                    {card.stat}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
