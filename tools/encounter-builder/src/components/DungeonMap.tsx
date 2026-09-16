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
              </g>
            );
          }
          // Zero-cell nodes (dead ends, secret doors, some stairs) — a small marker at the anchor.
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={px(node.anchor.x) + CELL_PX / 2}
                cy={py(node.anchor.y) + CELL_PX / 2}
                r={CELL_PX / 2.5}
                fill={color}
                stroke={isSelected ? "#8a3b2a" : "#5c4a33"}
                strokeWidth={isSelected ? 2 : 1}
              />
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
