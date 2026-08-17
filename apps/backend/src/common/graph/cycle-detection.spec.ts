import { wouldCreateCycle } from './cycle-detection';

/** `graph[id]` lists what `id` currently depends on (its predecessors) — the same shape
 * ActivitiesService/ActivityTemplatesService read out of their dependency tables. */
function predecessorsOf(graph: Record<number, number[]>) {
  return async (id: number) => graph[id] ?? [];
}

describe('wouldCreateCycle', () => {
  it('allows adding a dependency to an activity with no existing chain', async () => {
    const graph = {};
    expect(await wouldCreateCycle(1, 2, predecessorsOf(graph))).toBe(false);
  });

  it('detects a direct cycle (A depends on B, B would depend on A)', async () => {
    // A -> B (A depends on B)
    const graph = { 1: [2] };
    // Adding B -> A would close the loop.
    expect(await wouldCreateCycle(1, 2, predecessorsOf(graph))).toBe(true);
  });

  it('detects an indirect cycle (A -> B -> C, C would depend on A)', async () => {
    const graph = { 1: [2], 2: [3] };
    // Adding C -> A would close A -> B -> C -> A.
    expect(await wouldCreateCycle(1, 3, predecessorsOf(graph))).toBe(true);
  });

  it('allows a new edge that only extends the chain further', async () => {
    const graph = { 1: [2], 2: [3] };
    // D -> A is a valid new predecessor, not a cycle.
    expect(await wouldCreateCycle(1, 4, predecessorsOf(graph))).toBe(false);
  });

  it('allows a diamond (two independent chains converging on the same predecessor)', async () => {
    const graph = { 1: [2], 3: [2] };
    expect(await wouldCreateCycle(2, 4, predecessorsOf(graph))).toBe(false);
  });

  it('does not loop forever on an already-cyclic graph (defensive — should never occur in practice)', async () => {
    const graph = { 1: [2], 2: [1] };
    expect(await wouldCreateCycle(1, 3, predecessorsOf(graph))).toBe(false);
  });
});
