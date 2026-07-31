import { Card, Group, Loader, Text, Title, UnstyledButton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ActivityStatus } from '@workflow-brasal/shared';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listActivities } from '../api/activities';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

interface MonthCard {
  month: number;
  year: number;
  total: number;
  lateCount: number;
}

export function ProjetosPage() {
  const navigate = useNavigate();
  const activitiesQuery = useQuery({ queryKey: ['activities', 'all'], queryFn: () => listActivities() });

  const monthCards = useMemo<MonthCard[]>(() => {
    const grouped = new Map<string, MonthCard>();
    (activitiesQuery.data ?? []).forEach((activity) => {
      if (activity.dueDateRuleMonth == null || activity.dueDateRuleYear == null) return;
      // Never show months beyond the current one — closure generation itself never runs ahead.
      if (
        activity.dueDateRuleYear > CURRENT_YEAR ||
        (activity.dueDateRuleYear === CURRENT_YEAR && activity.dueDateRuleMonth > CURRENT_MONTH)
      ) {
        return;
      }
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

  return (
    <>
      <Title order={2} mb="md">
        Projetos
      </Title>

      {activitiesQuery.isLoading ? (
        <Loader />
      ) : (
        <Group gap="md">
          {monthCards.map((card) => (
            <UnstyledButton
              key={`${card.year}-${card.month}`}
              onClick={() => navigate(`/dashboard?month=${card.month}&year=${card.year}`)}
            >
              <Card withBorder w={200} h={200} padding="md">
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
              </Card>
            </UnstyledButton>
          ))}
        </Group>
      )}
    </>
  );
}
