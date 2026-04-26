import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITIES, StatusBadge } from "@/lib/status";
import type { Task, Column } from "./KanbanView";

type Props = {
  columns: Column[];
  tasks: Task[];
  assigneeName: (id: string | null) => string | null;
  onMove: (taskId: string, newColumnId: string) => void;
};

export const ListView = ({ columns, tasks, assigneeName, onMove }: Props) => {
  const colName = (id: string | null) => columns.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarea</TableHead>
            <TableHead>Columna</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Progreso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.title}</TableCell>
              <TableCell>
                <Select value={t.column_id ?? ""} onValueChange={(v) => onMove(t.id, v)}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><StatusBadge value={t.priority} options={PRIORITIES} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{assigneeName(t.assignee_id) ?? "—"}</TableCell>
              <TableCell className="text-sm">{t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-xs">{t.progress}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin tareas.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
