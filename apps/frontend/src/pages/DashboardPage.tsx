import {
  Card,
  Group,
  Loader,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listActivities } from '../api/activities';
import { listProjects } from '../api/projects';
import { listUsers } from '../api/users';
import { KANBAN_COLUMNS, STATUS_COLOR, STATUS_LABEL } from '../constants/status';
import { computeDashboardStats } from './dashboard/computeStats';

const now = new Date();

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700}>
        {value}
      </Text>
    </Card>
  );
}

export function DashboardPage() {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'dashboard', month, year],
    queryFn: () => listActivities({ month, year }),
  });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const stats = useMemo(() => {
    if (!activitiesQuery.data || !projectsQuery.data || !usersQuery.data) return null;
    return computeDashboardStats(activitiesQuery.data, projectsQuery.data, usersQuery.data);
  }, [activitiesQuery.data, projectsQuery.data, usersQuery.data]);

  const isLoading = activitiesQuery.isLoading || projectsQuery.isLoading || usersQuery.isLoading;

  return (
    <>
      <Title order={2} mb="md">
        Dashboard
      </Title>

      {isLoading || !stats ? (
        <Loader />
      ) : (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <StatCard label="Projetos ativos" value={String(stats.activeProjects)} />
            <StatCard label="Atividades atrasadas" value={String(stats.lateCount)} />
            <StatCard label="Horas excedentes acumuladas" value={stats.totalExceededHours.toFixed(1)} />
            <StatCard label="Atraso médio (h)" value={stats.averageDelayHours.toFixed(1)} />
            <StatCard
              label="Lead time médio (dias)"
              value={stats.averageLeadTimeDays != null ? stats.averageLeadTimeDays.toFixed(1) : '—'}
            />
            <StatCard label="% conclusão" value={`${stats.completionRate.toFixed(0)}%`} />
            <StatCard
              label="% no prazo"
              value={stats.onTimeRate != null ? `${stats.onTimeRate.toFixed(0)}%` : '—'}
            />
          </SimpleGrid>

          <Group>
            <Card withBorder padding="md">
              <Stack align="center" gap={4}>
                <RingProgress
                  size={120}
                  thickness={12}
                  sections={[{ value: stats.completionRate, color: 'green' }]}
                  label={
                    <Text ta="center" fw={700}>
                      {stats.completionRate.toFixed(0)}%
                    </Text>
                  }
                />
                <Text size="sm" c="dimmed">
                  Concluído
                </Text>
              </Stack>
            </Card>
            <Card withBorder padding="md">
              <Stack align="center" gap={4}>
                <RingProgress
                  size={120}
                  thickness={12}
                  sections={[{ value: stats.onTimeRate ?? 0, color: 'blue' }]}
                  label={
                    <Text ta="center" fw={700}>
                      {stats.onTimeRate != null ? `${stats.onTimeRate.toFixed(0)}%` : '—'}
                    </Text>
                  }
                />
                <Text size="sm" c="dimmed">
                  No prazo
                </Text>
              </Stack>
            </Card>
          </Group>

          <Card withBorder padding="md">
            <Text fw={600} mb="sm">
              Atividades por status
            </Text>
            <Progress.Root size={28}>
              {KANBAN_COLUMNS.map((status) => {
                const count = stats.statusCounts[status];
                if (count === 0) return null;
                return (
                  <Progress.Section key={status} value={(count / (activitiesQuery.data?.length || 1)) * 100} color={STATUS_COLOR[status]}>
                    <Progress.Label>{count}</Progress.Label>
                  </Progress.Section>
                );
              })}
            </Progress.Root>
            <Group mt="xs" gap="md">
              {KANBAN_COLUMNS.map((status) => (
                <Group key={status} gap={4}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: `var(--mantine-color-${STATUS_COLOR[status]}-6)`,
                    }}
                  />
                  <Text size="xs">
                    {STATUS_LABEL[status]} ({stats.statusCounts[status]})
                  </Text>
                </Group>
              ))}
            </Group>
          </Card>

          <Card withBorder padding="md">
            <Text fw={600} mb="sm">
              Produtividade por responsável
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Responsável</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Concluídas</Table.Th>
                  <Table.Th>% concluído</Table.Th>
                  <Table.Th>Horas excedentes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stats.byResponsible.map((row) => (
                  <Table.Tr key={row.responsibleId}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.total}</Table.Td>
                    <Table.Td>{row.done}</Table.Td>
                    <Table.Td>{row.completionRate.toFixed(0)}%</Table.Td>
                    <Table.Td>{row.exceededHours.toFixed(1)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>

          <Card withBorder padding="md">
            <Text fw={600} mb="sm">
              Gargalos por atividade
            </Text>
            {stats.bottlenecks.length === 0 ? (
              <Text size="sm" c="dimmed">
                Nenhum gargalo neste mês.
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Atividade</Table.Th>
                    <Table.Th>Responsável</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Horas excedentes</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {stats.bottlenecks.map((row) => (
                    <Table.Tr key={row.activityId}>
                      <Table.Td>{row.title}</Table.Td>
                      <Table.Td>{row.responsibleName}</Table.Td>
                      <Table.Td>
                        <Text c={STATUS_COLOR[row.status]} fw={600} size="sm">
                          {STATUS_LABEL[row.status]}
                        </Text>
                      </Table.Td>
                      <Table.Td>{row.exceededHours.toFixed(1)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Stack>
      )}
    </>
  );
}
