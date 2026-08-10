import { Alert, Center, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityDto, ActivityStatus, ProjectDto } from '@workflow-brasal/shared';
import { listAllDependencies, listActivities } from '../api/activities';
import { ApiError } from '../api/client';
import { listProjects } from '../api/projects';
import { listUsers } from '../api/users';
import { ActivityDetailsDrawer } from './atividades/ActivityDetailsDrawer';
import { EMPTY_GANTT_FILTERS, GanttFilterBar, GanttFilters } from './gantt/GanttFilterBar';
import { GanttDependencyOverlay } from './gantt/GanttDependencyOverlay';
import { GanttProjectGroup } from './gantt/GanttProjectGroup';
import { GanttTimelineHeader } from './gantt/GanttTimelineHeader';
import { GanttZoomControl } from './gantt/GanttZoomControl';
import { DEFAULT_ZOOM, LABEL_COLUMN_WIDTH, PROJECT_HEADER_HEIGHT, ROW_HEIGHT, ZOOM_PX_PER_DAY, ZoomLevel } from './gantt/gantt.constants';
import {
  BarGeometry,
  computeBarGeometry,
  computeConnectorPath,
  computeGridlines,
  computeVisibleDateRange,
  dateToX,
} from './gantt/gantt.layout';

function matchesFilters(activity: ActivityDto, filters: GanttFilters, blockedActivityIds: Set<number>): boolean {
  if (filters.responsibleId != null && activity.responsibleId !== filters.responsibleId) return false;
  if (filters.status != null && activity.status !== filters.status) return false;
  if (filters.priority != null && activity.priority !== filters.priority) return false;
  if (filters.onlyLate && activity.status !== ActivityStatus.LATE) return false;
  if (filters.onlyBlocked && !blockedActivityIds.has(activity.id)) return false;

  const [from, to] = filters.dateRange;
  if ((from || to) && activity.deadline) {
    const deadline = new Date(activity.deadline);
    if (from && deadline < from) return false;
    if (to && deadline > to) return false;
  }
  return true;
}

export function GanttPage() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(DEFAULT_ZOOM);
  const [filters, setFilters] = useState<GanttFilters>(EMPTY_GANTT_FILTERS);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<number>>(new Set());
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(null);

  const activitiesQuery = useQuery({ queryKey: ['activities'], queryFn: () => listActivities() });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const depsQuery = useQuery({ queryKey: ['activity-dependencies-all'], queryFn: listAllDependencies });

  const isLoading =
    activitiesQuery.isLoading || projectsQuery.isLoading || usersQuery.isLoading || depsQuery.isLoading;
  const queryError = [activitiesQuery.error, projectsQuery.error, usersQuery.error, depsQuery.error].find(
    (error): error is Error => !!error,
  );

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    (usersQuery.data ?? []).forEach((u) => map.set(u.id, u.name));
    return map;
  }, [usersQuery.data]);

  const activityById = useMemo(() => {
    const map = new Map<number, ActivityDto>();
    (activitiesQuery.data ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [activitiesQuery.data]);

  const predecessorsByActivityId = useMemo(() => {
    const map = new Map<number, number[]>();
    (depsQuery.data ?? []).forEach((edge) => {
      const list = map.get(edge.activityId) ?? [];
      list.push(edge.dependsOnActivityId);
      map.set(edge.activityId, list);
    });
    return map;
  }, [depsQuery.data]);

  /** Same predicate as ActivitiesService.getBlockedBy (a predecessor not yet DONE), just
   * evaluated in memory over the already-fetched bulk data instead of one activity at a time —
   * not a new business rule. */
  const blockedActivityIds = useMemo(() => {
    const blocked = new Set<number>();
    predecessorsByActivityId.forEach((predecessorIds, activityId) => {
      const isBlocked = predecessorIds.some((id) => activityById.get(id)?.status !== ActivityStatus.DONE);
      if (isBlocked) blocked.add(activityId);
    });
    return blocked;
  }, [predecessorsByActivityId, activityById]);

  const filteredActivities = useMemo(
    () => (activitiesQuery.data ?? []).filter((a) => matchesFilters(a, filters, blockedActivityIds)),
    [activitiesQuery.data, filters, blockedActivityIds],
  );

  const undatedCount = useMemo(() => filteredActivities.filter((a) => !a.deadline).length, [filteredActivities]);
  const renderableActivities = useMemo(() => filteredActivities.filter((a) => a.deadline), [filteredActivities]);

  const activitiesByProjectId = useMemo(() => {
    const map = new Map<number, ActivityDto[]>();
    renderableActivities.forEach((a) => {
      const list = map.get(a.projectId) ?? [];
      list.push(a);
      map.set(a.projectId, list);
    });
    // Sort each project's rows chronologically — same comparator AtividadesPage already uses,
    // not something to trust the API's own ordering for (ties on deadline aren't guaranteed
    // to come back in a stable order).
    map.forEach((activities) =>
      activities.sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime()),
    );
    return map;
  }, [renderableActivities]);

  const projectsToShow = useMemo<ProjectDto[]>(() => {
    return (projectsQuery.data ?? []).filter((p) => (activitiesByProjectId.get(p.id)?.length ?? 0) > 0);
  }, [projectsQuery.data, activitiesByProjectId]);

  const visibleRange = useMemo(() => computeVisibleDateRange(renderableActivities), [renderableActivities]);
  const pxPerDay = ZOOM_PX_PER_DAY[zoomLevel];

  const trackWidth = visibleRange ? Math.ceil(dateToX(visibleRange.end, visibleRange.start, pxPerDay)) : 0;

  const gridlines = useMemo(
    () => (visibleRange ? computeGridlines(visibleRange.start, visibleRange.end, zoomLevel, pxPerDay) : []),
    [visibleRange, zoomLevel, pxPerDay],
  );

  const now = new Date();
  const todayX =
    visibleRange && now >= visibleRange.start && now <= visibleRange.end
      ? dateToX(now, visibleRange.start, pxPerDay)
      : null;

  const geometryByActivityId = useMemo(() => {
    const map = new Map<number, BarGeometry | null>();
    if (!visibleRange) return map;
    renderableActivities.forEach((activity) => {
      map.set(activity.id, computeBarGeometry(activity, visibleRange.start, pxPerDay));
    });
    return map;
  }, [renderableActivities, visibleRange, pxPerDay]);

  const activityYById = useMemo(() => {
    const map = new Map<number, number>();
    let y = 0;
    projectsToShow.forEach((project) => {
      y += PROJECT_HEADER_HEIGHT;
      if (collapsedProjectIds.has(project.id)) return;
      (activitiesByProjectId.get(project.id) ?? []).forEach((activity) => {
        map.set(activity.id, y + ROW_HEIGHT / 2);
        y += ROW_HEIGHT;
      });
    });
    return map;
  }, [projectsToShow, activitiesByProjectId, collapsedProjectIds]);

  const totalBodyHeight = useMemo(() => {
    let height = 0;
    projectsToShow.forEach((project) => {
      height += PROJECT_HEADER_HEIGHT;
      if (collapsedProjectIds.has(project.id)) return;
      height += (activitiesByProjectId.get(project.id)?.length ?? 0) * ROW_HEIGHT;
    });
    return height;
  }, [projectsToShow, activitiesByProjectId, collapsedProjectIds]);

  const connectorPaths = useMemo(() => {
    const paths: string[] = [];
    (depsQuery.data ?? []).forEach((edge) => {
      const fromY = activityYById.get(edge.dependsOnActivityId);
      const toY = activityYById.get(edge.activityId);
      const fromGeometry = geometryByActivityId.get(edge.dependsOnActivityId);
      const toGeometry = geometryByActivityId.get(edge.activityId);
      if (fromY == null || toY == null || !fromGeometry || !toGeometry) return;
      paths.push(
        computeConnectorPath(
          { x: fromGeometry.left + fromGeometry.width, y: fromY },
          { x: toGeometry.left, y: toY },
        ),
      );
    });
    return paths;
  }, [depsQuery.data, activityYById, geometryByActivityId]);

  function toggleCollapse(projectId: number) {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const selectedResponsibleName =
    selectedActivity?.responsibleId != null ? userNameById.get(selectedActivity.responsibleId) ?? '—' : '—';
  const selectedCoResponsibleName =
    selectedActivity?.coResponsibleId != null ? userNameById.get(selectedActivity.coResponsibleId) ?? null : null;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2}>Gantt</Title>
        <GanttZoomControl value={zoomLevel} onChange={setZoomLevel} />
      </Group>

      <GanttFilterBar
        users={usersQuery.data ?? []}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_GANTT_FILTERS)}
      />

      {undatedCount > 0 && (
        <Text size="xs" c="dimmed">
          {undatedCount} atividade{undatedCount > 1 ? 's' : ''} sem prazo definido não {undatedCount > 1 ? 'são' : 'é'} exibida
          {undatedCount > 1 ? 's' : ''} no Gantt.
        </Text>
      )}

      {isLoading ? (
        <Center h={240}>
          <Loader />
        </Center>
      ) : queryError ? (
        <Alert color="red" title="Erro ao carregar o Gantt">
          {queryError instanceof ApiError ? queryError.message : 'Erro inesperado ao carregar os dados.'}
        </Alert>
      ) : !visibleRange || projectsToShow.length === 0 ? (
        <Center h={240}>
          <Text c="dimmed">Nenhuma atividade encontrada para os filtros selecionados.</Text>
        </Center>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ position: 'relative', width: LABEL_COLUMN_WIDTH + trackWidth }}>
              <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 4, background: 'var(--mantine-color-body)' }}>
                <div
                  style={{
                    width: LABEL_COLUMN_WIDTH,
                    flexShrink: 0,
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    background: 'var(--mantine-color-body)',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                  }}
                />
                <GanttTimelineHeader gridlines={gridlines} todayX={todayX} width={trackWidth} />
              </div>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: LABEL_COLUMN_WIDTH,
                    width: trackWidth,
                    height: totalBodyHeight,
                    pointerEvents: 'none',
                  }}
                >
                  <GanttDependencyOverlay paths={connectorPaths} width={trackWidth} height={totalBodyHeight} />
                  {todayX != null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: todayX,
                        top: 0,
                        height: totalBodyHeight,
                        width: 2,
                        background: 'var(--mantine-color-workflow-6)',
                      }}
                    />
                  )}
                </div>

                {projectsToShow.map((project) => (
                  <GanttProjectGroup
                    key={project.id}
                    project={project}
                    activities={activitiesByProjectId.get(project.id) ?? []}
                    collapsed={collapsedProjectIds.has(project.id)}
                    onToggleCollapse={() => toggleCollapse(project.id)}
                    userNameById={userNameById}
                    blockedActivityIds={blockedActivityIds}
                    geometryByActivityId={geometryByActivityId}
                    trackWidth={trackWidth}
                    onSelectActivity={setSelectedActivity}
                  />
                ))}
              </div>
            </div>
          </div>
        </Paper>
      )}

      <ActivityDetailsDrawer
        activity={selectedActivity}
        responsibleName={selectedResponsibleName}
        coResponsibleName={selectedCoResponsibleName}
        onClose={() => setSelectedActivity(null)}
      />
    </Stack>
  );
}
