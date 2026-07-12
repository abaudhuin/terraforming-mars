export const MULLIGAN_CATEGORIES = ['project', 'corporation', 'prelude', 'ceo'] as const;

export type MulliganCategory = typeof MULLIGAN_CATEGORIES[number];

export type MulliganOptions = Record<MulliganCategory, boolean>;

export const NO_MULLIGAN: MulliganOptions = {
  project: false,
  corporation: false,
  prelude: false,
  ceo: false,
};
