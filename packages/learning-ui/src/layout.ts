/**
 * Layered layout for flow diagrams: each node goes one layer after its furthest predecessor
 * (longest path), so arrows always point forward. Cycles are not expected (content is
 * validated) but are tolerated by placing the remaining nodes in a final layer.
 */
export function layerNodes(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
): string[][] {
  const known = new Set(nodeIds);
  const incoming = new Map(nodeIds.map((id) => [id, 0]));
  const next = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const e of edges) {
    if (!known.has(e.from) || !known.has(e.to) || e.from === e.to) continue;
    next.get(e.from)?.push(e.to);
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }
  const layerOf = new Map<string, number>();
  const queue = nodeIds.filter((id) => incoming.get(id) === 0);
  for (const id of queue) layerOf.set(id, 0);
  while (queue.length) {
    const id = queue.shift() as string;
    for (const to of next.get(id) ?? []) {
      layerOf.set(to, Math.max(layerOf.get(to) ?? 0, (layerOf.get(id) ?? 0) + 1));
      incoming.set(to, (incoming.get(to) ?? 0) - 1);
      if (incoming.get(to) === 0) queue.push(to);
    }
  }
  const last = Math.max(-1, ...layerOf.values()) + 1;
  for (const id of nodeIds) if (!layerOf.has(id)) layerOf.set(id, last);
  const layers: string[][] = [];
  for (const id of nodeIds) {
    const l = layerOf.get(id) ?? 0;
    layers[l] ??= [];
    (layers[l] as string[]).push(id);
  }
  return layers.filter(Boolean);
}
