export const curriculumKeys = {
  taxonomy: ['admin', 'curriculum', 'taxonomy'] as const,
  index: ['admin', 'curriculum', 'index'] as const,
  target: (roleId: string, bracketId: string) =>
    ['admin', 'curriculum', 'target', roleId, bracketId] as const,
};
