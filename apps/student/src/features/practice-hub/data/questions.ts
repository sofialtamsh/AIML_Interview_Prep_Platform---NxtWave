import type { Question } from '../types';
import generated from './questions.generated.json';

/** Every question on the page, generated from data/questions.csv (see docs/QUESTIONS-SHEET.md). */
export const QUESTIONS = generated.questions as Question[];
/** True on preview builds that also list draft questions. */
export const SHOWING_DRAFTS = generated.showDrafts;
