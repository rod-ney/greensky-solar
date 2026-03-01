"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Task, TaskStatus, Project, Technician } from "@/types";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statusDots: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

type TechTask = Task & { projectName: string };

export default function TechnicianCalendarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, techRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/profile/technician", { cache: "no-store" }),
        ]);
        setProjects(projectsRes.ok ? (((await projectsRes.json()) as { items: Project[] }).items ?? []) : []);
        const techData = techRes.ok ? ((await techRes.json()) as Technician | null) : null;
        setTechnicians(techData ? [techData] : []);
      } catch {
        setProjects([]);
        setTechnicians([]);
      }
    };
    void load();
  }, []);

  const tech = technicians[0] ?? null;

  const myTasks = useMemo(() => {
    const rows: TechTask[] = [];
    projects.forEach((p) => {
      p.tasks
        .filter((t) => (tech ? t.assignedTo === tech.id : false))
        .forEach((t) => rows.push({ ...t, projectName: p.name }));
    });
    return rows;
  }, [projects, tech]);

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

  const getTasksForDate = (day: number) =>
    myTasks.filter((t) => t.dueDate === dateStr(day));

  const hasTask = (day: number) => getTasksForDate(day).length > 0;

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedTasks = selectedDate
    ? myTasks.filter((t) => t.dueDate === selectedDate)
    : [];

  const navigateMonth = (dir: -1 | 1) => {
    const m = month + dir;
    if (m < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(m);
    }
    setSelectedDate(null);
  };

  const upcomingTasks = [...myTasks]
    .filter((t) => new Date(t.dueDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track your assigned tasks by date
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
              <div
                key={d}
                className="px-1 py-2.5 text-center text-xs font-medium text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`e-${idx}`}
                    className="h-20 border-b border-r border-slate-50"
                  />
                );
              }

              const ds = dateStr(day);
              const tasksForDay = getTasksForDate(day);
              const sel = selectedDate === ds;
              const tod = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(sel ? null : ds)}
                  className={`relative h-20 border-b border-r border-slate-50 p-1.5 text-left transition-colors ${
                    sel ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      tod
                        ? "bg-brand text-white"
                        : sel
                        ? "text-brand font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>

                  {hasTask(day) && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {tasksForDay.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className={`h-1.5 w-1.5 rounded-full ${statusDots[t.status]}`}
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
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[11px] text-slate-500">To Do</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[11px] text-slate-500">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[11px] text-slate-500">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-slate-500">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Tasks */}
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

              {selectedTasks.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-slate-500">
                    Tasks ({selectedTasks.length})
                  </p>
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-100 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          {task.title}
                        </span>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="text-xs text-slate-600">{task.projectName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        Due: {formatDate(task.dueDate)}
                      </div>
                      <StatusBadge status={task.priority} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-xs text-slate-400">No tasks due on this date.</p>
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
                  Click on a date to view your due tasks
                </p>
              </div>
            </div>
          )}

          {/* Upcoming Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Upcoming Tasks
            </h3>
            <div className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-slate-400">No upcoming tasks.</p>
              ) : (
                upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedDate(task.dueDate)}
                    className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col items-center rounded-lg bg-brand-50 px-2 py-1.5 min-w-[44px]">
                      <span className="text-[10px] font-medium text-brand">
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-base font-bold text-brand">
                        {new Date(task.dueDate).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {task.projectName}
                      </p>
                    </div>
                    <span className={`mt-1 h-2 w-2 rounded-full ${statusDots[task.status]}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">
          Note: Calendar shows tasks by <span className="font-medium">due date</span>.
        </p>
      </div>
    </div>
  );
}
