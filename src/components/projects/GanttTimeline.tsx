"use client";

type TimelineItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BAR_COLORS = ["bg-amber-400", "bg-lime-500", "bg-orange-400", "bg-rose-500", "bg-cyan-500"];

function parseDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - start.getTime()) / msPerDay);
}

function percentFromDay(day: number): number {
  return (day / 365) * 100;
}

export default function GanttTimeline({ items, title = "Gantt Timeline" }: { items: TimelineItem[]; title?: string }) {
  const validItems = items
    .map((item) => {
      const start = parseDate(item.startDate);
      const end = parseDate(item.endDate);
      if (!start || !end) return null;
      const startDay = dayOfYear(start);
      const endDay = Math.max(startDay + 1, dayOfYear(end));
      return { ...item, startDay, endDay };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (validItems.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-[#f3f5f8] p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-700">{title}</h2>
      <div className="overflow-x-auto">
        <div className="min-w-[900px] overflow-hidden rounded-lg border border-slate-300 bg-[#eef1f5]">
          <div className="grid grid-cols-[190px_1fr] border-b border-slate-300 bg-[#e7ebf1]">
            <div className="border-r border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Task</div>
            <div>
              <div className="grid grid-cols-12 border-b border-slate-300">
                {MONTHS.map((month) => (
                  <div key={`${month}-header`} className="border-r border-slate-300 py-1 text-center text-xs font-semibold text-slate-600 last:border-r-0">
                    {month}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-12">
                {MONTHS.map((month) => (
                  <div key={`${month}-days`} className="grid grid-cols-4 border-r border-slate-300 py-1 text-center text-[10px] text-slate-500 last:border-r-0">
                    <span>1</span>
                    <span>8</span>
                    <span>15</span>
                    <span>22</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {validItems.map((item, index) => {
            const left = percentFromDay(item.startDay);
            const width = Math.max(1.5, percentFromDay(item.endDay - item.startDay));
            const barColor =
              item.status === "completed"
                ? "bg-emerald-500"
                : item.status === "cancelled"
                ? "bg-slate-400"
                : BAR_COLORS[index % BAR_COLORS.length];

            return (
              <div key={item.id} className="grid grid-cols-[190px_1fr] border-b border-slate-300 last:border-b-0">
                <div className="border-r border-slate-300 px-3 py-2 text-sm text-slate-600">{item.name}</div>
                <div className="relative h-10 bg-[linear-gradient(to_right,transparent_0%,transparent_8.333%,#d5dbe5_8.333%,#d5dbe5_8.5%,transparent_8.5%,transparent_16.666%,#d5dbe5_16.666%,#d5dbe5_16.833%,transparent_16.833%,transparent_25%,#d5dbe5_25%,#d5dbe5_25.167%,transparent_25.167%,transparent_33.333%,#d5dbe5_33.333%,#d5dbe5_33.5%,transparent_33.5%,transparent_41.666%,#d5dbe5_41.666%,#d5dbe5_41.833%,transparent_41.833%,transparent_50%,#d5dbe5_50%,#d5dbe5_50.167%,transparent_50.167%,transparent_58.333%,#d5dbe5_58.333%,#d5dbe5_58.5%,transparent_58.5%,transparent_66.666%,#d5dbe5_66.666%,#d5dbe5_66.833%,transparent_66.833%,transparent_75%,#d5dbe5_75%,#d5dbe5_75.167%,transparent_75.167%,transparent_83.333%,#d5dbe5_83.333%,#d5dbe5_83.5%,transparent_83.5%,transparent_91.666%,#d5dbe5_91.666%,#d5dbe5_91.833%,transparent_91.833%,transparent_100%)]">
              <div
                    className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${barColor}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

