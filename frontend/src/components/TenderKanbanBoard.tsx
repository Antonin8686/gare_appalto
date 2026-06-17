import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { updateTenderFase } from "../api/tenders";
import type { Tender, TenderFase } from "../types/tender";
import { TENDER_FASI } from "../types/tender";
import { TenderKanbanCard, TenderKanbanCardOverlay } from "./TenderKanbanCard";
import "./TenderKanbanBoard.css";

interface TenderKanbanBoardProps {
  tenders: Tender[];
}

interface KanbanColumnProps {
  fase: TenderFase;
  label: string;
  tenders: Tender[];
}

function KanbanColumn({ fase, label, tenders }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: fase });

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column kanban-column--${fase}${isOver ? " kanban-column--over" : ""}`}
    >
      <header className="kanban-column__header">
        <h3>{label}</h3>
        <span className="kanban-column__count">{tenders.length}</span>
      </header>

      <div className="kanban-column__cards">
        {tenders.map((tender) => (
          <TenderKanbanCard key={tender.id} tender={tender} />
        ))}
      </div>
    </section>
  );
}

export function TenderKanbanBoard({ tenders }: TenderKanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTender, setActiveTender] = useState<Tender | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const tendersByFase = useMemo(() => {
    const grouped = Object.fromEntries(
      TENDER_FASI.map(({ value }) => [value, [] as Tender[]]),
    ) as Record<TenderFase, Tender[]>;

    for (const tender of tenders) {
      grouped[tender.fase]?.push(tender);
    }

    return grouped;
  }, [tenders]);

  const updateFaseMutation = useMutation({
    mutationFn: ({ id, fase }: { id: number; fase: TenderFase }) => updateTenderFase(id, fase),
    onMutate: async ({ id, fase }) => {
      await queryClient.cancelQueries({ queryKey: ["tenders"] });
      const previous = queryClient.getQueryData<Tender[]>(["tenders"]);
      queryClient.setQueryData<Tender[]>(["tenders"], (current) =>
        current?.map((tender) => (tender.id === id ? { ...tender, fase } : tender)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tenders"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      queryClient.invalidateQueries({ queryKey: ["imported-tenders"] });
      queryClient.invalidateQueries({ queryKey: ["scouting-tenders"] });
    },
  });

  function handleDragStart(event: DragStartEvent) {
    const tender = event.active.data.current?.tender as Tender | undefined;
    setActiveTender(tender ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTender(null);

    const tender = event.active.data.current?.tender as Tender | undefined;
    const targetFase = event.over?.id as TenderFase | undefined;

    if (!tender || !targetFase || tender.fase === targetFase) {
      return;
    }

    if (!TENDER_FASI.some(({ value }) => value === targetFase)) {
      return;
    }

    updateFaseMutation.mutate({ id: tender.id, fase: targetFase });
  }

  function handleDragCancel() {
    setActiveTender(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kanban-board">
        {TENDER_FASI.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            fase={value}
            label={label}
            tenders={tendersByFase[value]}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTender ? <TenderKanbanCardOverlay tender={activeTender} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
