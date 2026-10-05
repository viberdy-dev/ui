"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

export function SortableList({ items: initial = ["Wireframe", "Design", "Build", "Ship"] }: { items?: string[] }) {
  const [items, setItems] = useState(initial);

  return (
    <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex w-72 flex-col gap-2">
      {items.map((item) => (
        <Row key={item} item={item} />
      ))}
    </Reorder.Group>
  );
}

function Row({ item }: { item: string }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm"
    >
      <button
        aria-label="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-neutral-400 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <span className="text-sm font-medium">{item}</span>
    </Reorder.Item>
  );
}
