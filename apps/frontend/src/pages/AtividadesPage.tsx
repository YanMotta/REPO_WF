import { Badge, Loader, Table, Text, Title, UnstyledButton } from '@mantine/core';
import { ActivityDto } from '@workflow-brasal/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { generateClosure, listActivities } from '../api/activities';
import { listUsers } from '../api/users';
import { STATUS_COLOR, STATUS_LABEL } from '../constants/status';
import { formatBusinessDayRule, formatDate, formatTime } from '../utils/format';
import { ActivityDetailsDrawer } from './atividades/ActivityDetailsDrawer';
import { PredecessorCell } from './atividades/PredecessorCell';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

export function AtividadesPage() {
  const [selected, setSelected] = useState<ActivityDto | null>(null);

  const generateMutation = useMutation({ mutationFn: () => generateClosure() });

  useEffect(() => {
    generateMutation.mutate();
    // Only ever generate for the current month, on mount — never a client-chosen past month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activitiesQuery = useQuery({
    queryKey: ['activities', CURRENT_YEAR, CURRENT_MONTH],
    queryFn: () => listActivities({ month: CURRENT_MONTH, year: CURRENT_YEAR }),
    enabled: generateMutation.isSuccess || generateMutation.isError,
  });

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const sortedActivities = useMemo(() => {
    const list = activitiesQuery.data ?? [];
    return [...list].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [activitiesQuery.data]);

  const rowNumberById = useMemo(() => {
    const map = new Map<number, number>();
    sortedActivities.forEach((activity, index) => map.set(activity.id, index + 1));
    return map;
  }, [sortedActivities]);

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    (usersQuery.data ?? []).forEach((user) => map.set(user.id, user.name));
    return map;
  }, [usersQuery.data]);

  const isLoading = generateMutation.isPending || activitiesQuery.isLoading;

  return (
    <>
      <Title order={2} mb="xs">
        Cronogramas — Atividades do mês
      </Title>
      <Text c="dimmed" mb="md">
        {sortedActivities.length} atividade{sortedActivities.length === 1 ? '' : 's'} neste mês
      </Text>

      {isLoading ? (
        <Loader />
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Atividade</Table.Th>
              <Table.Th>Responsável</Table.Th>
              <Table.Th>Predecessora</Table.Th>
              <Table.Th>Premissa</Table.Th>
              <Table.Th>Previsto</Table.Th>
              <Table.Th>Horário</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedActivities.map((activity) => (
              <Table.Tr key={activity.id}>
                <Table.Td>{rowNumberById.get(activity.id)}</Table.Td>
                <Table.Td>
                  <UnstyledButton c="workflow.7" fw={600} onClick={() => setSelected(activity)}>
                    {activity.title}
                  </UnstyledButton>
                </Table.Td>
                <Table.Td>
                  {activity.responsibleId ? (userNameById.get(activity.responsibleId) ?? '—') : '—'}
                </Table.Td>
                <Table.Td>
                  <PredecessorCell activityId={activity.id} rowNumberById={rowNumberById} />
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="workflow">
                    {formatBusinessDayRule(activity.businessDayOffset)}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatDate(activity.deadline)}</Table.Td>
                <Table.Td>{activity.dueTime ?? formatTime(activity.deadline)}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[activity.status]}>{STATUS_LABEL[activity.status]}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <ActivityDetailsDrawer
        activity={selected}
        responsibleName={
          selected?.responsibleId ? (userNameById.get(selected.responsibleId) ?? '—') : '—'
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}
