import { Popover, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { changeActivityCoResponsible } from '../../api/activities';

interface ResponsibleCellProps {
  activityId: number;
  responsibleName: string;
  responsibleId: number | null;
  coResponsibleId: number | null;
  userOptions: { value: string; label: string }[];
  userNameById: Map<number, string>;
}

/** Click the responsible name to assign/change/clear the co-responsible — a stand-in who can
 * pick up the activity if the primary responsible is on vacation or overloaded. */
export function ResponsibleCell({
  activityId,
  responsibleName,
  responsibleId,
  coResponsibleId,
  userOptions,
  userNameById,
}: ResponsibleCellProps) {
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newCoResponsibleId: number | null) =>
      changeActivityCoResponsible(activityId, newCoResponsibleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  });

  const coResponsibleName = coResponsibleId != null ? (userNameById.get(coResponsibleId) ?? '—') : null;
  const availableOptions = userOptions.filter((option) => Number(option.value) !== responsibleId);

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton onClick={() => setOpened((o) => !o)}>
          <Stack gap={0}>
            <Text size="sm">{responsibleName}</Text>
            <Text size="xs" c={coResponsibleName ? 'workflow.7' : 'dimmed'}>
              {coResponsibleName ? `Co-resp.: ${coResponsibleName}` : '+ co-responsável'}
            </Text>
          </Stack>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Select
          label="Co-responsável"
          description="Assume a atividade se o responsável estiver de férias ou sobrecarregado"
          placeholder="Selecionar"
          data={availableOptions}
          value={coResponsibleId != null ? String(coResponsibleId) : null}
          onChange={(value) => mutation.mutate(value ? Number(value) : null)}
          clearable
          disabled={mutation.isPending}
          w={240}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
