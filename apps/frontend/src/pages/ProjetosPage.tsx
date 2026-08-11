import { ActionIcon, Card, Group, Loader, SimpleGrid, Text, Title, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityStatus } from '@workflow-brasal/shared';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteClosure, listActivities } from '../api/activities';
import { ApiError } from '../api/client';

interface MonthCard {
  month: number;
  year: number;
  total: number;
  lateCount: number;
}

export function ProjetosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activitiesQuery = useQuery({ queryKey: ['activities', 'all'], queryFn: () => listActivities() });

  const deleteMutation = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => deleteClosure(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      notifications.show({ color: 'green', message: 'Cronograma excluído.' });
    },
    onError: (err: unknown) =>
      notifications.show({
        color: 'red',
        title: 'Erro ao excluir cronograma',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      }),
  });

  const monthCards = useMemo<MonthCard[]>(() => {
    const grouped = new Map<string, MonthCard>();
    (activitiesQuery.data ?? []).forEach((activity) => {
      if (activity.dueDateRuleMonth == null || activity.dueDateRuleYear == null) return;
      const key = `${activity.dueDateRuleYear}-${activity.dueDateRuleMonth}`;
      const entry = grouped.get(key) ?? {
        month: activity.dueDateRuleMonth,
        year: activity.dueDateRuleYear,
        total: 0,
        lateCount: 0,
      };
      entry.total += 1;
      if (activity.status === ActivityStatus.LATE) entry.lateCount += 1;
      grouped.set(key, entry);
    });
    return Array.from(grouped.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [activitiesQuery.data]);

  function confirmDelete(card: MonthCard) {
    const confirmed = window.confirm(
      `Excluir o cronograma de ${String(card.month).padStart(2, '0')}/${card.year}? ` +
        `Essa ação remove todas as ${card.total} atividade${card.total === 1 ? '' : 's'} desse mês e não pode ser desfeita.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate({ month: card.month, year: card.year });
  }

  return (
    <>
      <Title order={2} mb="md">
        Lista de Cronogramas
      </Title>

      {activitiesQuery.isLoading ? (
        <Loader />
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 3, md: 4 }} spacing="md">
          {monthCards.map((card) => (
            <Card key={`${card.year}-${card.month}`} withBorder h={200} padding="md" pos="relative">
              <ActionIcon
                variant="subtle"
                color="red"
                pos="absolute"
                top={8}
                right={8}
                onClick={(event) => {
                  event.stopPropagation();
                  confirmDelete(card);
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
              <UnstyledButton
                onClick={() => navigate(`/dashboard?month=${card.month}&year=${card.year}`)}
                w="100%"
                h="100%"
              >
                <Group h="100%" justify="center" align="center">
                  <div style={{ textAlign: 'center' }}>
                    <Text fw={700}>
                      Cronograma - {String(card.month).padStart(2, '0')}/{String(card.year).slice(-2)}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {card.total} atividade{card.total === 1 ? '' : 's'}
                    </Text>
                    <Text size="sm" c={card.lateCount > 0 ? 'red' : 'dimmed'} mt={2}>
                      {card.lateCount} atrasada{card.lateCount === 1 ? '' : 's'}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
