"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";

type Card = { id: string; label: string };
type Columns = Record<string, Card[]>;

export function KanbanDragColumns({
  initialColumns,
}: {
  initialColumns: Columns;
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const names = Object.keys(columns);

  function moveCard(cardId: string, from: string, to: string) {
    if (from === to) return;
    setColumns((prev) => {
      const card = prev[from]?.find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((c) => c.id !== cardId),
        [to]: [...(prev[to] ?? []), card],
      };
    });
  }

  return (
    <div className="flex gap-3">
      {names.map((name) => (
        <div key={name} data-column={name} className="w-40 rounded-xl border border-neutral-200 p-2">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">{name}</p>
          <Reorder.Group
            axis="y"
            values={columns[name]}
            onReorder={(newOrder) => setColumns((prev) => ({ ...prev, [name]: newOrder }))}
            className="flex flex-col gap-1.5"
          >
            {columns[name].map((card) => (
              <Reorder.Item
                key={card.id}
                value={card}
                onDragEnd={(e, info) => {
                  const target = document.elementFromPoint(info.point.x, info.point.y);
                  const col = target?.closest<HTMLElement>("[data-column]");
                  if (col?.dataset.column) moveCard(card.id, name, col.dataset.column);
                }}
                whileDrag={{ scale: 1.04, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
                className="cursor-grab rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium active:cursor-grabbing"
              >
                {card.label}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      ))}
    </div>
  );
}
