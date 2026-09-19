// Pure geometry for buildingLayout.ts's non-rectangular Temple footprints (rhombus, hexagon,
// octagon, star, circle, oval) — not a book concept at all, see buildingLayout.ts's own header.
// Every shape is defined as a small set of unit vertices (roughly radius 1, centered on the
// origin, listed clockwise in this engine's y-down grid space), scaled uniformly to hit a target
// perimeter (so "Number of Rooms" still roughly determines the building's overall size, the same
// way the rectangle layout's SLOT_PITCH sizing does), then inset by a true perpendicular offset
// (`insetOutline` — see its own doc comment for why a cheaper scale-toward-center approximation
// looked fine for a hexagon/octagon/circle but badly pinched a star's narrow valleys) to produce
// the aisle-ring and courtyard boundaries.
export type TempleShape = "rectangle" | "rhombus" | "hexagon" | "octagon" | "star" | "circle" | "oval";

export interface Pt {
  x: number;
  y: number;
}

function regularPolygon(sides: number): Pt[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

function starPolygon(points: number, innerRatio: number): Pt[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : innerRatio;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

function unitVertices(shape: Exclude<TempleShape, "rectangle">): Pt[] {
  switch (shape) {
    case "rhombus":
      return [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ];
    case "hexagon":
      return regularPolygon(6);
    case "octagon":
      return regularPolygon(8);
    case "star":
      return starPolygon(5, 0.5);
    case "circle":
      return regularPolygon(28);
    case "oval":
      return regularPolygon(28).map((p) => ({ x: p.x * 1.4, y: p.y }));
  }
}

export function polygonPerimeter(verts: Pt[]): number {
  let total = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export function minVertexRadius(verts: Pt[]): number {
  return Math.min(...verts.map((v) => Math.hypot(v.x, v.y)));
}

/** Scales the shape's unit vertices so its own perimeter is approximately `targetPerimeter` grid
 * cells — the polygon equivalent of the rectangle layout's SLOT_PITCH-based sizing. */
export function scaledOutline(shape: Exclude<TempleShape, "rectangle">, targetPerimeter: number): Pt[] {
  const unit = unitVertices(shape);
  const scale = targetPerimeter / polygonPerimeter(unit);
  return unit.map((v) => ({ x: v.x * scale, y: v.y * scale }));
}

function lineIntersection(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return p1; // parallel — shouldn't happen for these shapes' own edges
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/** A true perpendicular inward offset: each edge is shifted inward (along its own outward normal,
 * see `pointAndNormalAtArcLength`'s convention) by `amount`, and each new vertex is the
 * intersection of its two adjacent shifted edges. An earlier version of this scaled every vertex
 * toward the centroid by one shared factor instead — cheap, and fine for a regular polygon (a
 * hexagon/octagon/circle's own symmetry makes the two approaches nearly identical), but badly wrong
 * for a concave shape like a star: it shrinks the already-narrow valleys by the same ABSOLUTE
 * amount as the wide points, so at a typical building's scale the valleys end up nearly (or fully)
 * pinched shut, breaking the courtyard/aisle ring into a lopsided, disconnected-looking mess
 * instead of a clean small star. A true per-edge offset keeps the wall thickness constant
 * everywhere along the perimeter regardless of local curvature, which is what a real building's
 * uniform wall thickness actually implies. `outline` must be centered on the origin (unused here,
 * but kept for symmetry with the old signature and because callers rely on it). */
export function insetOutline(outline: Pt[], amount: number): Pt[] {
  const n = outline.length;
  if (n < 3) return outline;
  const shifted = outline.map((a, i) => {
    const b = outline[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const outwardNormal = { x: uy, y: -ux };
    return { dir: { x: ux, y: uy }, anchor: { x: a.x - outwardNormal.x * amount, y: a.y - outwardNormal.y * amount } };
  });
  return outline.map((_, i) => {
    const prev = shifted[(i - 1 + n) % n];
    const cur = shifted[i];
    return lineIntersection(prev.anchor, prev.dir, cur.anchor, cur.dir);
  });
}

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function boundingBox(poly: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: Math.min(...poly.map((p) => p.x)),
    maxX: Math.max(...poly.map((p) => p.x)),
    minY: Math.min(...poly.map((p) => p.y)),
    maxY: Math.max(...poly.map((p) => p.y)),
  };
}

export function translate(poly: Pt[], dx: number, dy: number): Pt[] {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** A point at arc-length `dist` along the closed polygon's perimeter (wrapping), plus the outward
 * unit normal of whichever edge it landed on — used to drop room bays evenly around the shape and
 * orient each one facing inward. Every vertex generator above lists vertices clockwise in this
 * engine's y-down grid space, so `(uy, -ux)` (not the more common `(-uy, ux)`) is the outward
 * normal for that winding — verified against the hexagon's own top-to-right edge, whose outward
 * normal must point up-and-right, away from the origin. */
export function pointAndNormalAtArcLength(poly: Pt[], dist: number): { point: Pt; outwardNormal: Pt } {
  const total = polygonPerimeter(poly);
  let d = ((dist % total) + total) % total;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= segLen || i === poly.length - 1) {
      const t = segLen === 0 ? 0 : d / segLen;
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const ux = (b.x - a.x) / (segLen || 1);
      const uy = (b.y - a.y) / (segLen || 1);
      const outwardNormal = { x: uy, y: -ux };
      return { point, outwardNormal };
    }
    d -= segLen;
  }
  return { point: poly[0], outwardNormal: { x: 0, y: -1 } };
}
