import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Project {
  id: string;
  client: string;
  name: string;
  hourlyRate: number;
  color?: string;
}

interface ProjectSwitcherProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
}

export function ProjectSwitcher({ projects, value, onChange }: ProjectSwitcherProps) {
  return (
    <div className="w-full max-w-sm">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Select project">
          <SelectValue placeholder="Choose project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color || "hsl(var(--primary))" }}
                />
                <span className="font-medium">{p.client}</span>
                <span className="text-muted-foreground">– {p.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
