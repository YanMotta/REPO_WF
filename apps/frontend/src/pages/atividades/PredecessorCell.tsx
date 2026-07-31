import { useQuery } from '@tanstack/react-query';
import { getActivity, getActivityDependencies } from '../../api/activities';

/**
 * Shows the row number when the predecessor is in the same month's table (per spec), otherwise
 * its title. A single dependency query drives this; the cross-month title lookup only fires for
 * dependencies not found in `rowNumberById`.
 */
export function PredecessorCell({
  activityId,
  rowNumberById,
}: {
  activityId: number;
  rowNumberById: Map<number, number>;
}) {
  const { data: dependencies } = useQuery({
    queryKey: ['activity-dependencies', activityId],
    queryFn: () => getActivityDependencies(activityId),
  });

  if (!dependencies || dependencies.length === 0) return <span>—</span>;

  return (
    <span>
      {dependencies.map((dep, index) => (
        <span key={dep.id}>
          {index > 0 && ', '}
          <PredecessorRef predecessorId={dep.dependsOnActivityId} rowNumberById={rowNumberById} />
        </span>
      ))}
    </span>
  );
}

function PredecessorRef({
  predecessorId,
  rowNumberById,
}: {
  predecessorId: number;
  rowNumberById: Map<number, number>;
}) {
  const rowNumber = rowNumberById.get(predecessorId);

  const { data: predecessor } = useQuery({
    queryKey: ['activity', predecessorId],
    queryFn: () => getActivity(predecessorId),
    enabled: rowNumber === undefined,
  });

  if (rowNumber !== undefined) return <>#{rowNumber}</>;
  return <>{predecessor?.title ?? '…'}</>;
}
