/**
 * Switches for student-facing features. A feature that is not ready is switched off here and
 * stays in the code: we hide features, we never delete them.
 */

/**
 * The read-aloud voice in slide decks (the device's text-to-speech). Off for V1: the device
 * voices sound robotic. Turn it on once a natural voice has been chosen. The admin lesson
 * preview keeps it on, so the team can still hear the narration scripts.
 */
export const LESSON_NARRATION = false;

/**
 * V1 is self-paced: students open a subject and work through its units in their own time. With
 * this on, the app has two tabs, Learn and Practice. The home dashboard, the dated roadmap
 * (finish-by date, week-by-week view, "behind", re-plan, calendar export) and the My plan page
 * are not shown: nothing in V1 runs to a schedule. Turn it off to bring all of them back.
 */
export const SELF_PACED = true;

/**
 * The subject card on the Learn tab while there is one track. Each track's units come from the
 * student's roadmap; only the card's name and one-line pitch are written here.
 */
export const LEARN_SUBJECT = {
  title: 'Machine Learning',
  blurb:
    'Classical machine learning, one algorithm at a time. Each unit explains the idea, lets you work it out in a live lab, then checks you with a quiz and interview questions.',
} as const;

/**
 * The Practice tab shows the AI/ML practice question hub (features/practice-hub), the page
 * students already know from nxtwave-aiml-practice-questions.vercel.app. Turn this off to go back
 * to the list of practice questions managed in Admin → Practice, which is kept as it was.
 */
export const PRACTICE_HUB = true;
