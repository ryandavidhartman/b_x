// Renders the generated node graph as an inline SVG grid. Every node's `cells` are drawn as
// individual unit squares (rather than one merged rect) — simplest way to stay correct for any
// heading/orientation without re-deriving rectangle geometry here, at the cost of a slightly
// blocky, pixel-grid look (acceptable for a schematic dungeon map, not meant to be beautiful).
import type { DungeonNode, NodeKind } from "../generators/randomDungeon";

const CELL_PX = 14;
const PAD_CELLS = 2;

const KIND_COLOR: Record<NodeKind, string> = {
  room: "#e8dcc4",
  chamber: "#d8c9a3",
  corridor: "#bfae87",
  cave: "#c7d9c0",
  cavern: "#c7d9c0",
  stairs: "#a9c4d8",
  deadEnd: "#c9928a",
  secretDoor: "#b89bd6",
};

/** Key number for a room/chamber/cave/stairs node, centered on its cells — cross-references the
 * room-by-room log the same way a published dungeon key's numbered map does. */
function AreaNumber({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={CELL_PX * 0.85} fontWeight={700} fill="#3a2f22" stroke="#fdf8ee" strokeWidth={2.5} paintOrder="stroke">
      {n}
    </text>
  );
}

const KIND_LABEL: Record<NodeKind, string> = {
  room: "Room",
  chamber: "Chamber",
  corridor: "Corridor",
  cave: "Cave / Cavern",
  cavern: "Cave / Cavern",
  stairs: "Stairs",
  deadEnd: "Dead End",
  secretDoor: "Secret Door",
};

export function DungeonMap({ nodes, selectedId, onSelect }: { nodes: DungeonNode[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (nodes.length === 0) {
    return <p className="note">No dungeon generated yet.</p>;
  }

  const points = nodes.flatMap((n) => (n.cells.length > 0 ? n.cells : [n.anchor]));
  const minX = Math.min(...points.map((p) => p.x)) - PAD_CELLS;
  const maxX = Math.max(...points.map((p) => p.x)) + PAD_CELLS;
  const minY = Math.min(...points.map((p) => p.y)) - PAD_CELLS;
  const maxY = Math.max(...points.map((p) => p.y)) + PAD_CELLS;
  const widthPx = (maxX - minX) * CELL_PX;
  const heightPx = (maxY - minY) * CELL_PX;

  function px(x: number) {
    return (x - minX) * CELL_PX;
  }
  function py(y: number) {
    return (y - minY) * CELL_PX;
  }

  const usedKinds = new Set(nodes.map((n) => n.kind));

  return (
    <div className="dungeon-map-wrap">
      <svg
        className="dungeon-map"
        width={Math.min(widthPx, 1400)}
        height={Math.min(heightPx, 900)}
        viewBox={`0 0 ${widthPx} ${heightPx}`}
        role="img"
        aria-label="Generated dungeon map"
      >
        {nodes.map((node) => {
          const isSelected = node.id === selectedId;
          const color = KIND_COLOR[node.kind];
          if (node.cells.length > 0) {
            const cx = node.cells.reduce((s, c) => s + px(c.x), 0) / node.cells.length + CELL_PX / 2;
            const cy = node.cells.reduce((s, c) => s + py(c.y), 0) / node.cells.length + CELL_PX / 2;
            return (
              <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
                {node.cells.map((c, i) => (
                  <rect
                    key={i}
                    x={px(c.x)}
                    y={py(c.y)}
                    width={CELL_PX - 1}
                    height={CELL_PX - 1}
                    fill={color}
                    stroke={isSelected ? "#8a3b2a" : "#5c4a33"}
                    strokeWidth={isSelected ? 2 : 0.5}
                  />
                ))}
                {node.areaNumber !== undefined && <AreaNumber x={cx} y={cy} n={node.areaNumber} />}
              </g>
            );
          }
          // Zero-cell nodes (dead ends, secret doors, some stairs) — a small marker at the anchor.
          const zx = px(node.anchor.x) + CELL_PX / 2;
          const zy = py(node.anchor.y) + CELL_PX / 2;
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={zx}
                cy={zy}
                r={CELL_PX / 2.5}
                fill={color}
                stroke={isSelected ? "#8a3b2a" : "#5c4a33"}
                strokeWidth={isSelected ? 2 : 1}
              />
              {node.areaNumber !== undefined && <AreaNumber x={zx} y={zy} n={node.areaNumber} />}
            </g>
          );
        })}
      </svg>
      <div className="dungeon-map-legend">
        {[...usedKinds].map((k) => (
          <span key={k} className="legend-item">
            <span className="legend-swatch" style={{ background: KIND_COLOR[k] }} />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}
