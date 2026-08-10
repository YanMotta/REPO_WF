/** Pure render of pre-computed connector paths — all geometry math happens in gantt.layout.ts /
 * GanttPage; this component only draws. Lives inside the same horizontally-scrolling container
 * as the bars (not a fixed overlay), so it pans together with them with no scroll listener. */
export function GanttDependencyOverlay({
  paths,
  width,
  height,
}: {
  paths: string[];
  width: number;
  height: number;
}) {
  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="gantt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mantine-color-gray-6)" />
        </marker>
      </defs>
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--mantine-color-gray-6)"
          strokeWidth={1.5}
          markerEnd="url(#gantt-arrow)"
        />
      ))}
    </svg>
  );
}
