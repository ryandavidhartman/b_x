// Shared shapes for every generated/*.json file produced by scripts/extract-appendix-data.mjs.

export interface Link {
  label: string;
  anchor: string;
}

export interface Cell {
  raw: string;
  links: Link[];
}

export type Row = Record<string, Cell>;

export interface Table {
  headers: string[];
  rows: Row[];
}

export interface MonsterEntry {
  variant: string | null;
  stats: Record<string, string>;
}

export interface MonsterHeading {
  name: string;
  entries: MonsterEntry[];
}

export type MonsterDb = Record<string, MonsterHeading>;
