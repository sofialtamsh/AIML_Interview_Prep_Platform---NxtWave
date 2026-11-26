import type { Role } from '../types';

/**
 * The role tabs on the roadmap, in order. Machine learning is part of every one of these roles,
 * so the ML Engineer roadmap is the one open today. The subject areas shown under the open tab come
 * from data/categories.json, so opening another role also needs its own list of subject areas.
 */
export const ROLES: Role[] = [
  { id: 'mle', name: 'Machine Learning Engineer', open: true },
  { id: 'ai', name: 'AI Engineer', open: false },
  { id: 'ds', name: 'Data Scientist', open: false },
];
