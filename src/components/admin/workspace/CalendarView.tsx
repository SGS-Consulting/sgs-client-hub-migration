import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Column } from "./KanbanView";

type Props = { tasks: Task[]; columns: Column[] };

export const CalendarView = ({ tasks, columns }: Props) => {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay();
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;

  const colColor = (id: string | null) => columns.find((c) => c.id === id)?.color ?? "#94a3b8";

  const tasksOn = (date: string) => tasks.filter((t) => t.due_date === date);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const monthLabel = cursor.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border rounded-lg overflow-hidden">
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map((d) => (
          <div key={d} className="bg-muted px-2 py-1.5 text-xs font-medium text-center">{d}</div>
        ))}
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= last.getDate();
          const date = inMonth ? new Date(year, month, dayNum) : null;
          const dateStr = date ? fmt(date) : "";
          const dayTasks = date ? tasksOn(dateStr) : [];
          const isToday = dateStr === fmt(new Date());

          return (
            <div key={i} className={cn("bg-background min-h-[90px] p-1.5", !inMonth && "bg-muted/30")}>
              {inMonth && (
                <>
                  <div className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>{dayNum}</div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="text-[10px] px-1.5 py-0.5 rounded truncate text-white" style={{ backgroundColor: colColor(t.column_id) }}>
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
