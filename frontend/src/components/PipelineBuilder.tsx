import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { KeyboardSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { PipelineStep } from "../types";

const OPERATORS = [">", "<", ">=", "<=", "==", "!="];
const AGG_FNS = ["sum", "avg", "median", "min", "max", "count"];

// Enforced pipeline order: 0→filter/deduplicate, 1→sort/limit, 2→select, 3→aggregate/group_by
const STEP_GROUP: Record<string, number> = {
  filter: 0,
  deduplicate: 0,
  sort: 1,
  limit: 1,
  select: 2,
  aggregate: 3,
  group_by: 3,
};
const TERMINAL_OPS = ["aggregate", "group_by"];

function insertIndexForGroup(steps: PipelineStep[], group: number): number {
  const idx = steps.findIndex((s) => (STEP_GROUP[s.op] ?? 0) > group);
  return idx === -1 ? steps.length : idx;
}

function isValidOrder(steps: PipelineStep[]): boolean {
  let maxGroup = -1;
  for (const s of steps) {
    const g = STEP_GROUP[s.op] ?? 0;
    if (g < maxGroup) return false;
    maxGroup = g;
  }
  return true;
}

interface Props {
  steps: PipelineStep[];
  onChange: (steps: PipelineStep[]) => void;
  columns?: string[];
}

function makeStep(op: string): PipelineStep {
  switch (op) {
    case "filter":
      return { op, column: "", operator: ">", value: 0 };
    case "aggregate":
      return { op, columns: [], functions: [] };
    case "group_by":
      return { op, by: "", aggregate: { column: "", function: "avg" } };
    case "select":
      return { op, columns: [] };
    case "sort":
      return { op, column: "", order: "asc" };
    case "limit":
      return { op, n: 10 };
    case "deduplicate":
      return { op, columns: [] };
    default:
      return { op };
  }
}

function StepEditor({
  step,
  columns,
  onChange,
}: {
  step: PipelineStep;
  columns: string[];
  onChange: (s: PipelineStep) => void;
}) {
  const set = (patch: Partial<PipelineStep>) => onChange({ ...step, ...patch });

  // Renders a column picker: dropdown if columns known, fallback to text input
  function ColPicker({
    value,
    onSelect,
    placeholder,
    className,
  }: {
    value: string;
    onSelect: (v: string) => void;
    placeholder?: string;
    className?: string;
  }) {
    if (columns.length > 0) {
      return (
        <select
          className={`input ${className ?? ""}`}
          value={value}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">— colonne —</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className={`input ${className ?? ""}`}
        placeholder={placeholder ?? "colonne"}
        value={value}
        onChange={(e) => onSelect(e.target.value)}
      />
    );
  }

  // Multi-column picker: checkboxes if columns known, fallback to comma-separated input
  function MultiColPicker({
    value,
    onSelect,
    placeholder,
  }: {
    value: string[];
    onSelect: (v: string[]) => void;
    placeholder?: string;
  }) {
    if (columns.length > 0) {
      return (
        <div className="flex flex-wrap gap-2">
          {columns.map((c) => {
            const checked = value.includes(c);
            return (
              <label key={c} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onSelect(checked ? value.filter((x) => x !== c) : [...value, c])
                  }
                />
                {c}
              </label>
            );
          })}
        </div>
      );
    }
    return (
      <input
        className="input"
        placeholder={placeholder ?? "col1, col2"}
        value={value.join(", ")}
        onChange={(e) =>
          onSelect(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }

  switch (step.op) {
    case "filter":
      return (
        <div className="flex flex-wrap gap-2 items-center">
          <ColPicker
            className="w-32"
            placeholder="colonne"
            value={(step.column as string) || ""}
            onSelect={(v) => set({ column: v })}
          />
          <select
            className="input w-20"
            value={(step.operator as string) || ">"}
            onChange={(e) => set({ operator: e.target.value })}
          >
            {OPERATORS.map((op) => (
              <option key={op}>{op}</option>
            ))}
          </select>
          <input
            className="input w-28"
            placeholder="valeur"
            value={String(step.value ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              set({ value: isNaN(Number(v)) ? v : Number(v) });
            }}
          />
        </div>
      );

    case "aggregate":
      return (
        <div className="space-y-2">
          <div>
            <label className="label">Colonnes</label>
            <MultiColPicker
              placeholder="salary, age"
              value={(step.columns as string[]) || []}
              onSelect={(v) => set({ columns: v })}
            />
          </div>
          <div>
            <label className="label">Fonctions</label>
            <div className="flex flex-wrap gap-2">
              {AGG_FNS.map((fn) => {
                const checked = ((step.functions as string[]) || []).includes(
                  fn,
                );
                return (
                  <label
                    key={fn}
                    className="flex items-center gap-1 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const fns = (step.functions as string[]) || [];
                        set({
                          functions: checked
                            ? fns.filter((f) => f !== fn)
                            : [...fns, fn],
                        });
                      }}
                    />
                    {fn}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );

    case "group_by": {
      const agg = (step.aggregate as { column: string; function: string }) || {
        column: "",
        function: "avg",
      };
      return (
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label">Grouper par</label>
            <ColPicker
              className="w-32"
              placeholder="department"
              value={(step.by as string) || ""}
              onSelect={(v) => set({ by: v })}
            />
          </div>
          <div>
            <label className="label">Colonne à agréger</label>
            <ColPicker
              className="w-32"
              placeholder="salary"
              value={agg.column}
              onSelect={(v) => set({ aggregate: { ...agg, column: v } })}
            />
          </div>
          <div>
            <label className="label">Fonction</label>
            <select
              className="input w-24"
              value={agg.function}
              onChange={(e) =>
                set({ aggregate: { ...agg, function: e.target.value } })
              }
            >
              {AGG_FNS.map((fn) => (
                <option key={fn}>{fn}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    case "select":
    case "deduplicate":
      return (
        <div>
          <label className="label">Colonnes</label>
          <MultiColPicker
            placeholder="name, age, city"
            value={(step.columns as string[]) || []}
            onSelect={(v) => set({ columns: v })}
          />
        </div>
      );

    case "sort":
      return (
        <div className="flex gap-2 items-end">
          <div>
            <label className="label">Colonne</label>
            <ColPicker
              className="w-32"
              placeholder="age"
              value={(step.column as string) || ""}
              onSelect={(v) => set({ column: v })}
            />
          </div>
          <div>
            <label className="label">Ordre</label>
            <select
              className="input w-24"
              value={(step.order as string) || "asc"}
              onChange={(e) => set({ order: e.target.value })}
            >
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </select>
          </div>
        </div>
      );

    case "limit":
      return (
        <div>
          <label className="label">Nombre de lignes</label>
          <input
            type="number"
            className="input w-24"
            value={(step.n as number) ?? 10}
            min={1}
            onChange={(e) => set({ n: parseInt(e.target.value) || 10 })}
          />
        </div>
      );

    default:
      return null;
  }
}

function SortableStep({
  id,
  step,
  index,
  isTerminal,
  isFixed,
  columns,
  onChange,
  onRemove,
}: {
  id: string;
  step: PipelineStep;
  index: number;
  isTerminal: boolean;
  isFixed: boolean;
  columns: string[];
  onChange: (s: PipelineStep) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled: isFixed });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        {!isFixed && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            title="Déplacer (dans le même groupe)"
          >
            ⠿
          </button>
        )}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              #{index + 1}
            </span>
            <select
              className="input text-sm font-medium"
              value={step.op}
              onChange={(e) => onChange(makeStep(e.target.value))}
            >
              <option value="filter">filter</option>
              <option value="deduplicate">deduplicate</option>
              <option value="sort">sort</option>
              <option value="limit">limit</option>
              <option value="select">select</option>
              <option value="aggregate">aggregate (terminal)</option>
              <option value="group_by">group_by (terminal)</option>
            </select>
            {isTerminal && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                terminal
              </span>
            )}
            {step.op === "select" && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                pré-terminal
              </span>
            )}
          </div>
          <StepEditor step={step} columns={columns} onChange={onChange} />
        </div>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 text-lg leading-none"
          title="Supprimer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function PipelineBuilder({ steps, onChange, columns = [] }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = steps.map((_, i) => String(i));

  function addStep() {
    const newStep = makeStep("filter");
    const idx = insertIndexForGroup(steps, STEP_GROUP["filter"]);
    const next = [...steps];
    next.splice(idx, 0, newStep);
    onChange(next);
  }

  function updateStep(index: number, s: PipelineStep) {
    const prevGroup = STEP_GROUP[steps[index].op] ?? 0;
    const newGroup = STEP_GROUP[s.op] ?? 0;
    const next = [...steps];
    if (prevGroup === newGroup) {
      next[index] = s;
    } else {
      next.splice(index, 1);
      const insertIdx = insertIndexForGroup(next, newGroup);
      next.splice(insertIdx, 0, s);
    }
    onChange(next);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    const moved = arrayMove(steps, oldIndex, newIndex);
    if (!isValidOrder(moved)) return;
    onChange(moved);
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {steps.map((step, i) => (
            <SortableStep
              key={i}
              id={String(i)}
              step={step}
              index={i}
              isTerminal={TERMINAL_OPS.includes(step.op)}
              isFixed={step.op === "select" || TERMINAL_OPS.includes(step.op)}
              columns={columns}
              onChange={(s) => updateStep(i, s)}
              onRemove={() => removeStep(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addStep}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        + Ajouter une étape
      </button>
    </div>
  );
}
