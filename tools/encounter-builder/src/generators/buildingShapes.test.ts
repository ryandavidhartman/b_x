import { describe, it, expect } from "vitest";
import { scaledOutline, insetOutline, pointInPolygon, pointAndNormalAtArcLength, polygonPerimeter } from "./buildingShapes";

describe("scaledOutline", () => {
  it("hits the requested perimeter for every shape", () => {
    for (const shape of ["rhombus", "hexagon", "octagon", "star", "circle", "oval"] as const) {
      const outline = scaledOutline(shape, 100);
      expect(polygonPerimeter(outline)).toBeCloseTo(100, 5);
    }
  });
});

describe("insetOutline", () => {
  it("shrinks every vertex toward the origin", () => {
    const outline = scaledOutline("hexagon", 120);
    const inset = insetOutline(outline, 10);
    for (let i = 0; i < outline.length; i++) {
      expect(Math.hypot(inset[i].x, inset[i].y)).toBeLessThan(Math.hypot(outline[i].x, outline[i].y));
    }
  });
});

describe("pointInPolygon", () => {
  it("classifies the origin as inside and a far-away point as outside, for every shape", () => {
    for (const shape of ["rhombus", "hexagon", "octagon", "star", "circle", "oval"] as const) {
      const outline = scaledOutline(shape, 100);
      expect(pointInPolygon({ x: 0, y: 0 }, outline)).toBe(true);
      expect(pointInPolygon({ x: 1000, y: 1000 }, outline)).toBe(false);
    }
  });
});

describe("pointAndNormalAtArcLength", () => {
  it("points the outward normal away from the origin, all the way around a hexagon", () => {
    const outline = scaledOutline("hexagon", 120);
    const total = polygonPerimeter(outline);
    for (let d = 0; d < total; d += 3) {
      const { point, outwardNormal } = pointAndNormalAtArcLength(outline, d);
      // The outward normal, from the boundary point, should move further from the origin, not closer.
      const here = Math.hypot(point.x, point.y);
      const stepped = Math.hypot(point.x + outwardNormal.x * 0.1, point.y + outwardNormal.y * 0.1);
      expect(stepped).toBeGreaterThan(here);
      // And it should be a unit vector.
      expect(Math.hypot(outwardNormal.x, outwardNormal.y)).toBeCloseTo(1, 5);
    }
  });
});
