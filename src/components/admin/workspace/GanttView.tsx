import { useMemo } from "react";
import type { Task, Column } from "./KanbanView";
import { cn } from "@/lib/utils";

type Props = { tasks: Task[]; columns: Column[] };

const DAY_MS = 86400000;

export const GanttView = ({ tasks, columns }: Props) => {
  const dated = tasks.filter((t) => t.start_date && t.due_date);
  const colColor = (id: string | null) => columns.find((c) => c.id === id)?.color ?? "#94a3b8";

  const { min, max, days } = useMemo(() => {
    if (dated.length === 0) {
      const now = new Date();
      return { min: now, max: new Date(now.getTime() + 30 * DAY_MS), days: 30 };
    }
    const starts = dated.map((t) => new Date(t.start_date!).getTime());
    const ends = dated.map((t) => new Date(t.due_date!).getTime());
    const minT = Math.min(...starts);
    const maxT = Math.max(...ends);
    const padded = new Date(minT - 2 * DAY_MS);
    const padEnd = new Date(maxT + 2 * DAY_MS);
    const d = Math.ceil((padEnd.getTime() - padded.getTime()) / DAY_MS);
    return { min: padded, max: padEnd, days: d };
  }, [dated]);

  const dayWidth = 28;
  const totalWidth = days * dayWidth;

  if (dated.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Añade fechas de inicio y vencimiento a las tareas para verlas en el Gantt.</div>;
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <div className="flex">
        {/* Left labels */}
        <div className="w-[220px] shrink-0 border-r bg-muted/30">
          <div className="h-10 border-b px-3 flex items-center text-xs font-medium">Tarea</div>
          {dated.map((t) => (
            <div key={t.id} className="h-10 border-b px-3 flex items-center text-xs truncate">{t.title}</div>
          ))}
        </div>

        {/* Right timeline */}
        <div className="overflow-x-auto" style={{ width: "100%" }}>
          <div style={{ width: totalWidth }}>
            {/* Header */}
            <div className="h-10 border-b flex sticky top-0 bg-background z-10">
              {Array.from({ length: days }).map((_, i) => {
                const d = new Date(min.getTime() + i * DAY_MS);
                const isFirst = d.getDate() === 1;
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={i} style={{ width: dayWidth }} className={cn("text-[10px] flex flex-col items-center justify-center border-r", isFirst && "bg-muted/50", isToday && "bg-primary/10")}>
                    <span className="text-muted-foreground">{d.toLocaleString("default", { month: "short" }).slice(0,3)}</span>
                    <span className={cn("font-medium", isToday && "text-primary")}>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
            {/* Bars */}
            {dated.map((t) => {
              const start = new Date(t.start_date!);
              const end = new Date(t.due_date!);
              const offset = Math.floor((start.getTime() - min.getTime()) / DAY_MS) * dayWidth;
              const width = Math.max(dayWidth, (Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1) * dayWidth);
              return (
                <div key={t.id} className="h-10 border-b relative">
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2 text-[11px] text-white font-medium overflow-hidden shadow-sm"
                    style={{ left: offset, width, backgroundColor: colColor(t.column_id) }}
                    title={t.title}
                  >
                    <span className="truncate">{t.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
