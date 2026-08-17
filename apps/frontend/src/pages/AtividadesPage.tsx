import { Badge, Group, Loader, Select, Table, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { ActivityDto, ActivityStatus, Role } from '@workflow-brasal/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listActivities } from '../api/activities';
import { listUsers } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { CurrentMonthBadge } from '../components/CurrentMonthBadge';
import { usePeriod } from '../period/PeriodContext';
import { formatBusinessDayRule, formatDate, formatTime } from '../utils/format';
import { ActivityDetailsDrawer } from './atividades/ActivityDetailsDrawer';
import { PredecessorCell } from './atividades/PredecessorCell';
import { ResponsibleCell } from './atividades/ResponsibleCell';
import { StatusCell } from './atividades/StatusCell';

const ALL_RESPONSIBLE = 'all';
const NO_RESPONSIBLE = 'none';

export function AtividadesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const [selected, setSelected] = useState<ActivityDto | null>(null);
  // Members/managers land on their own activities first ("minhas atividades") — admins, whose job
  // is overseeing everyone, still default to seeing the whole team.
  const [responsibleFilter, setResponsibleFilter] = useState<string>(() =>
    isAdmin || !user ? ALL_RESPONSIBLE : String(user.id),
  );
  const [numberFilter, setNumberFilter] = useState('');

  const { month, year, isLoading: monthLoading } = usePeriod();

  const activitiesQuery = useQuery({
    queryKey: ['activities', year, month],
    queryFn: () => listActivities({ month, year }),
    enabled: !monthLoading,
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
        activity.responsibleId !== Number(responsibleFilter) &&
        activity.coResponsibleId !== Number(responsibleFilter)
      ) {
        return false;
      }
      if (trimmedNumber && rowNumberById.get(activity.id) !== Number(trimmedNumber)) return false;
      return true;
    });
  }, [sortedActivities, rowNumberById, responsibleFilter, numberFilter]);

  const isLoading = monthLoading || activitiesQuery.isLoading;

  return (
    <>
      <Group justify="space-between" mb="xs">
        <Title order={2}>Cronogramas — Atividades do mês</Title>
        <CurrentMonthBadge month={month} year={year} />
      </Group>
      <Text c="dimmed" mb="md">
        {filteredActivities.length} atividade{filteredActivities.length === 1 ? '' : 's'}
        {filteredActivities.length !== sortedActivities.length ? ` de ${sortedActivities.length}` : ''} neste mês
      </Text>

      <Group mb="md">
        <Select
          label="Responsável"
          data={responsibleOptions}
          value={responsibleFilter}
          onChange={(value) => setResponsibleFilter(value ?? ALL_RESPONSIBLE)}
          allowDeselect={false}
          w={{ base: '100%', sm: 220 }}
        />
        <TextInput
          label="Número"
          placeholder="Ex: 3"
          value={numberFilter}
          onChange={(event) => setNumberFilter(event.currentTarget.value.replace(/\D/g, ''))}
          w={{ base: '100%', sm: 120 }}
        />
      </Group>

      {isLoading ? (
        <Loader />
      ) : (
        <Table.ScrollContainer minWidth={700}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Atividade</Table.Th>
              <Table.Th>Responsável</Table.Th>
              <Table.Th>Predecessora</Table.Th>
              <Table.Th>Premissa</Table.Th>
              <Table.Th>Previsto</Table.Th>
              <Table.Th>Horário limite</Table.Th>
              <Table.Th>Concluído</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredActivities.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={9}>
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
                  {(activity.status === ActivityStatus.DONE || activity.status === ActivityStatus.LATE) &&
                  activity.completionDate
                    ? formatTime(activity.completionDate)
                    : '—'}
                </Table.Td>
                <Table.Td>
                  <StatusCell
                    activityId={activity.id}
                    status={activity.status}
                    responsibleId={activity.responsibleId}
                    coResponsibleId={activity.coResponsibleId}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Table.ScrollContainer>
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
