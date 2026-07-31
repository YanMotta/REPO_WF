import { DragDropContext, Draggable, DropResult, Droppable } from '@hello-pangea/dnd';
import { Badge, Card, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityDto, ActivityStatus } from '@workflow-brasal/shared';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { changeActivityStatus, listActivities } from '../api/activities';
import { ApiError } from '../api/client';
import { listUsers } from '../api/users';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { KANBAN_COLUMNS, STATUS_COLOR, STATUS_LABEL } from '../constants/status';
import { formatDate } from '../utils/format';

const now = new Date();

export function KanbanPage() {
  const { id: projectIdParam } = useParams();
  const projectId = projectIdParam ? Number(projectIdParam) : undefined;

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const queryClient = useQueryClient();
  const queryKey = ['activities', 'kanban', month, year, projectId];

  const activitiesQuery = useQuery({
    queryKey,
    queryFn: () => listActivities({ month, year, projectId }),
  });

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    (usersQuery.data ?? []).forEach((user) => map.set(user.id, user.name));
    return map;
  }, [usersQuery.data]);

  const statusMutation = useMutation({
    mutationFn: ({ activityId, status }: { activityId: number; status: ActivityStatus }) =>
      changeActivityStatus(activityId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Não foi possível mover a atividade',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const columns = useMemo(() => {
    const grouped = new Map<ActivityStatus, ActivityDto[]>();
    KANBAN_COLUMNS.forEach((status) => grouped.set(status, []));
    (activitiesQuery.data ?? []).forEach((activity) => {
      grouped.get(activity.status)?.push(activity);
    });
    return grouped;
  }, [activitiesQuery.data]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const targetStatus = result.destination.droppableId as ActivityStatus;
    const activityId = Number(result.draggableId);
    const activity = (activitiesQuery.data ?? []).find((a) => a.id === activityId);
    if (!activity || activity.status === targetStatus) return;

    // READY_TO_START/LATE are system-only — let the backend reject it, surfaced via onError.
    if (targetStatus === ActivityStatus.DONE) {
      const confirmed = window.confirm(
        `Confirma a conclusão de "${activity.title}"? Essa ação marca a atividade como Concluída.`,
      );
      if (!confirmed) return;
    }

    statusMutation.mutate({ activityId, status: targetStatus });
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Quadro Kanban</Title>
        <MonthYearSelector
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
        />
      </Group>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Group align="flex-start" wrap="nowrap" style={{ overflowX: 'auto' }}>
          {KANBAN_COLUMNS.map((status) => (
            <Paper key={status} withBorder p="sm" w={260} miw={260} bg="var(--mantine-color-body)">
              <Group justify="space-between" mb="xs">
                <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>
                <Text size="xs" c="dimmed">
                  {columns.get(status)?.length ?? 0}
                </Text>
              </Group>
              <Droppable droppableId={status}>
                {(provided) => (
                  <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps} mih={80}>
                    {columns.get(status)?.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={String(activity.id)} index={index}>
                        {(dragProvided) => (
                          <Card
                            withBorder
                            padding="sm"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <Text size="sm" fw={600}>
                              {activity.title}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {activity.responsibleId
                                ? (userNameById.get(activity.responsibleId) ?? '—')
                                : 'Sem responsável'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatDate(activity.deadline)}
                            </Text>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            </Paper>
          ))}
        </Group>
      </DragDropContext>
    </>
  );
}
