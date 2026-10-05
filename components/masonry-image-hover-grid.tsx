"use client";

import { motion } from "framer-motion";

type Tile = { src: string; label: string };

export function MasonryImageHoverGrid({ tiles, columns = 3 }: { tiles: Tile[]; columns?: number }) {
  return (
    <div className={`columns-${columns} gap-2.5`} style={{ columnCount: columns }}>
      {tiles.map((tile) => (
        <motion.div
          key={tile.src}
          tabIndex={0}
          whileHover="hover"
          whileFocus="hover"
          className="group relative mb-2.5 overflow-hidden rounded-xl break-inside-avoid outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <motion.img
            src={tile.src}
            alt={tile.label}
            variants={{ hover: { scale: 1.08 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          />
          <motion.div
            variants={{ hover: { opacity: 1, y: 0 } }}
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2"
          >
            <span className="text-sm font-semibold text-white">{tile.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
