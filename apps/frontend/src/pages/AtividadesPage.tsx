import { Badge, Group, Loader, Select, Table, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { ActivityDto } from '@workflow-brasal/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { generateClosure, listActivities } from '../api/activities';
import { listUsers } from '../api/users';
import { STATUS_COLOR, STATUS_LABEL } from '../constants/status';
import { formatBusinessDayRule, formatDate, formatTime } from '../utils/format';
import { ActivityDetailsDrawer } from './atividades/ActivityDetailsDrawer';
import { PredecessorCell } from './atividades/PredecessorCell';
import { ResponsibleCell } from './atividades/ResponsibleCell';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const ALL_RESPONSIBLE = 'all';
const NO_RESPONSIBLE = 'none';

export function AtividadesPage() {
  const [selected, setSelected] = useState<ActivityDto | null>(null);
  const [responsibleFilter, setResponsibleFilter] = useState<string>(ALL_RESPONSIBLE);
  const [numberFilter, setNumberFilter] = useState('');

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

  const userSelectOptions = useMemo(
    () => (usersQuery.data ?? []).map((user) => ({ value: String(user.id), label: user.name })),
    [usersQuery.data],
  );

  const responsibleOptions = useMemo(
    () => [
      { value: ALL_RESPONSIBLE, label: 'Todos' },
      { value: NO_RESPONSIBLE, label: 'Sem responsável' },
      ...userSelectOptions,
    ],
    [userSelectOptions],
  );

  const filteredActivities = useMemo(() => {
    const trimmedNumber = numberFilter.trim();
    return sortedActivities.filter((activity) => {
      if (responsibleFilter === NO_RESPONSIBLE && activity.responsibleId != null) return false;
      if (
        responsibleFilter !== ALL_RESPONSIBLE &&
        responsibleFilter !== NO_RESPONSIBLE &&
        activity.responsibleId !== Number(responsibleFilter)
      ) {
        return false;
      }
      if (trimmedNumber && rowNumberById.get(activity.id) !== Number(trimmedNumber)) return false;
      return true;
    });
  }, [sortedActivities, rowNumberById, responsibleFilter, numberFilter]);

  const isLoading = generateMutation.isPending || activitiesQuery.isLoading;

  return (
    <>
      <Title order={2} mb="xs">
        Cronogramas — Atividades do mês
      </Title>
      <Text c="dimmed" mb="md">
        {sortedActivities.length} atividade{sortedActivities.length === 1 ? '' : 's'} neste mês
      </Text>

      <Group mb="md">
        <Select
          label="Responsável"
          data={responsibleOptions}
          value={responsibleFilter}
          onChange={(value) => setResponsibleFilter(value ?? ALL_RESPONSIBLE)}
          allowDeselect={false}
          w={220}
        />
        <TextInput
          label="Número"
          placeholder="Ex: 3"
          value={numberFilter}
          onChange={(event) => setNumberFilter(event.currentTarget.value.replace(/\D/g, ''))}
          w={120}
        />
      </Group>

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
            {filteredActivities.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed" ta="center" py="md">
                    Nenhuma atividade encontrada para os filtros selecionados.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {filteredActivities.map((activity) => (
              <Table.Tr key={activity.id}>
                <Table.Td>{rowNumberById.get(activity.id)}</Table.Td>
                <Table.Td>
                  <UnstyledButton c="workflow.7" fw={600} onClick={() => setSelected(activity)}>
                    {activity.title}
                  </UnstyledButton>
                </Table.Td>
                <Table.Td>
                  <ResponsibleCell
                    activityId={activity.id}
                    responsibleId={activity.responsibleId}
                    responsibleName={
                      activity.responsibleId ? (userNameById.get(activity.responsibleId) ?? '—') : '—'
                    }
                    coResponsibleId={activity.coResponsibleId}
                    userOptions={userSelectOptions}
                    userNameById={userNameById}
                  />
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
        coResponsibleName={
          selected?.coResponsibleId ? (userNameById.get(selected.coResponsibleId) ?? '—') : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}
