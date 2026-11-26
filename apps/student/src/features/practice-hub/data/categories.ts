import {
  Brain,
  ChartColumnBig,
  Layers,
  type LucideIcon,
  MessageSquareText,
  ScanEye,
} from 'lucide-react';
import type { Accent, Category } from '../types';
import raw from './categories.json';

/** The five subject areas, in roadmap order. Edit names and descriptions in data/categories.json. */
export const CATEGORIES: Category[] = raw.map((c) => ({ ...c, accent: c.accent as Accent }));

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

const ICONS: Record<string, LucideIcon> = {
  chart: ChartColumnBig,
  brain: Brain,
  layers: Layers,
  text: MessageSquareText,
  eye: ScanEye,
};
export const iconOf = (c: Category): LucideIcon => ICONS[c.icon] ?? Brain;

/** The category's colour as a CSS value, plus a soft tint of it. */
export const accentOf = (c: Category) => `var(--${c.accent})`;
export const tintOf = (c: Category, pct = 14) =>
  `color-mix(in oklab, var(--${c.accent}) ${pct}%, transparent)`;
