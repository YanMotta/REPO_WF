/**
 * Depth-first search over a "depends on" graph, starting at `startId` and following existing
 * predecessor edges (via `getPredecessors`), to check whether `targetId` is reachable.
 *
 * Framework/entity-agnostic on purpose — both ActivitiesService and ActivityTemplatesService use
 * the same traversal over their own (differently-shaped) dependency tables, and it's plain enough
 * to unit-test directly against an in-memory graph instead of a mocked repository.
 */
export async function wouldCreateCycle(
  startId: number,
  targetId: number,
  getPredecessors: (id: number) => Promise<number[]>,
): Promise<boolean> {
  const visited = new Set<number>();
  const stack = [startId];
  while (stack.length) {
    const current = stack.pop() as number;
    if (current === targetId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const predecessors = await getPredecessors(current);
    stack.push(...predecessors);
  }
  return false;
}
