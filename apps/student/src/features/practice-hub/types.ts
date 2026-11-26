export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type QuestionType = 'Coding' | 'Practical' | 'Project';
export type Accent = 'g0' | 'g1' | 'g2' | 'g3' | 'g4';

/** One practice question on NxtWave Academy, as loaded from data/questions.csv. */
export interface Question {
  id: string;
  categoryId: string;
  course: string;
  topic: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  type: QuestionType;
  /** The exact question on NxtWave Academy. Opens in a new tab. */
  academyUrl: string;
  /** The Academy session that teaches the concept, when there is one. */
  videoUrl?: string;
  order: number;
  /** Only on preview builds (SHOW_DRAFTS=true): the link is not verified yet. */
  draft?: boolean;
}

export interface Category {
  id: string;
  name: string;
  short: string;
  fullName?: string;
  description: string;
  skills: string[];
  icon: string;
  accent: Accent;
}

export interface Filters {
  category: string;
  difficulty: Difficulty | 'all';
}

/** A career role on the roadmap. Locked roles show as "Coming soon". */
export interface Role {
  id: string;
  name: string;
  open: boolean;
}

export const ALL = 'all';
export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
