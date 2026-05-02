import { Card, CardContent } from "@/components/ui/card";
import { PRIORITIES, StatusBadge } from "@/lib/status";
import { Calendar, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  column_id: string | null;
  assignee_id: string | null;
  progress: number;
};

export type Column = { id: string; name: string; color: string; sort_order: number; is_done_column: boolean };

type Props = {
  columns: Column[];
  tasks: Task[];
  assigneeName: (id: string | null) => string | null;
  onMove: (taskId: string, newColumnId: string) => void;
  onAssignClick?: (taskId: string) => void;
};

export const KanbanView = ({ columns, tasks, assigneeName, onMove, onAssignClick }: Props) => {
  let draggedId: string | null = null;
  let dragMoved = false;

  return (
    <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.column_id === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (draggedId) onMove(draggedId, col.id); draggedId = null; }}
            className="rounded-lg bg-muted/30 p-3 min-h-[400px] border-t-4"
            style={{ borderTopColor: col.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="font-semibold text-sm">{col.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-background border">{colTasks.length}</span>
            </div>
            <div className="space-y-2">
              {colTasks.map((task) => {
                const today = new Date().toISOString().split("T")[0];
                const overdue = task.due_date && task.due_date < today && !col.is_done_column;
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => { draggedId = task.id; dragMoved = false; }}
                    onDrag={() => { dragMoved = true; }}
                    onClick={() => { if (!dragMoved && onAssignClick) onAssignClick(task.id); }}
                    className={cn("cursor-pointer transition hover:shadow-md hover:border-primary/40", overdue && "border-destructive/50")}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        <StatusBadge value={task.priority} options={PRIORITIES} />
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      {task.progress > 0 && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {assigneeName(task.assignee_id) && (
                          <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{assigneeName(task.assignee_id)}</span>
                        )}
                        {task.due_date && (
                          <span className={cn("flex items-center gap-1 ml-auto", overdue && "text-destructive font-medium")}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
