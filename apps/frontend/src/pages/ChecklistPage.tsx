import { ActionIcon, Badge, Button, Group, Loader, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityTemplateDto } from '@workflow-brasal/shared';
import { useState } from 'react';
import { createActivity, CreateActivityDto, generateClosure } from '../api/activities';
import {
  ActivityTemplateInput,
  createActivityTemplate,
  getActivityTemplateDependencies,
  listActivityTemplates,
  updateActivityTemplate,
} from '../api/activityTemplates';
import { ApiError } from '../api/client';
import { listProjects } from '../api/projects';
import { listUsers } from '../api/users';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { usePeriod } from '../period/PeriodContext';
import { formatBusinessDayRule } from '../utils/format';
import { CreateActivityModal } from './checklist/CreateActivityModal';
import { TemplateFormModal } from './checklist/TemplateFormModal';

const FECHAMENTO_MENSAL_PROJECT_NAME = 'Fechamento Mensal';

const now = new Date();

export function ChecklistPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ActivityTemplateDto | null>(null);
  const [editingDependsOn, setEditingDependsOn] = useState<number[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  // The month/year picked here is the app-wide selected period — Atividades, Dashboard, Quadro
  // and Gantt all read it via usePeriod(). Cronogramas and Usuários deliberately don't.
  const { month: generateMonth, year: generateYear, setPeriod } = usePeriod();

  const templatesQuery = useQuery({ queryKey: ['activity-templates'], queryFn: listActivityTemplates });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const fechamentoProjectId =
    projectsQuery.data?.find((p) => p.name === FECHAMENTO_MENSAL_PROJECT_NAME)?.id ?? null;

  const userNameById = new Map((usersQuery.data ?? []).map((u) => [u.id, u.name]));

  const createTemplateMutation = useMutation({
    mutationFn: (input: ActivityTemplateInput) => createActivityTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      setTemplateModalOpen(false);
    },
    onError: (err: unknown) =>
      notifications.show({
        color: 'red',
        title: 'Erro ao salvar modelo',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ActivityTemplateInput> }) =>
      updateActivityTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      setTemplateModalOpen(false);
    },
    onError: (err: unknown) =>
      notifications.show({
        color: 'red',
        title: 'Erro ao salvar modelo',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      }),
  });

  const createActivityMutation = useMutation({
    mutationFn: (dto: CreateActivityDto) => createActivity(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setActivityModalOpen(false);
      notifications.show({ color: 'green', message: 'Atividade criada com sucesso' });
    },
    onError: (err: unknown) =>
      notifications.show({
        color: 'red',
        title: 'Erro ao criar atividade',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      }),
  });

  const generateClosureMutation = useMutation({
    mutationFn: () => generateClosure(generateMonth, generateYear),
    onSuccess: ({ created }) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      notifications.show({
        color: 'green',
        message:
          created > 0
            ? `Cronograma gerado: ${created} atividade${created === 1 ? '' : 's'} criada${created === 1 ? '' : 's'}.`
            : 'Nenhuma atividade nova — o cronograma desse mês já existe.',
      });
    },
    onError: (err: unknown) =>
      notifications.show({
        color: 'red',
        title: 'Erro ao gerar cronograma',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      }),
  });

  const isPastMonth =
    generateYear < now.getFullYear() ||
    (generateYear === now.getFullYear() && generateMonth < now.getMonth() + 1);

  async function openNewTemplate() {
    setEditing(null);
    setEditingDependsOn([]);
    setTemplateModalOpen(true);
  }

  async function openEditTemplate(template: ActivityTemplateDto) {
    const deps = await getActivityTemplateDependencies(template.id);
    setEditing(template);
    setEditingDependsOn(deps.map((d) => d.dependsOnTemplateId));
    setTemplateModalOpen(true);
  }

  function handleTemplateSubmit(input: ActivityTemplateInput) {
    if (editing) {
      updateTemplateMutation.mutate({ id: editing.id, input });
    } else {
      createTemplateMutation.mutate(input);
    }
  }

  const isLoading = templatesQuery.isLoading || usersQuery.isLoading || projectsQuery.isLoading;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Checklist — Modelos de fechamento</Title>
        <Group>
          <Button variant="default" leftSection={<IconPlus size={16} />} onClick={() => setActivityModalOpen(true)}>
            Nova atividade avulsa
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openNewTemplate}>
            Novo modelo
          </Button>
        </Group>
      </Group>

      <Group mb="md" align="flex-end">
        <MonthYearSelector month={generateMonth} year={generateYear} onChange={setPeriod} />
        <Button
          onClick={() => generateClosureMutation.mutate()}
          loading={generateClosureMutation.isPending}
          disabled={isPastMonth}
        >
          Gerar cronograma
        </Button>
        {isPastMonth && (
          <Text size="xs" c="dimmed">
            Não é possível gerar cronograma de meses passados.
          </Text>
        )}
      </Group>

      {isLoading ? (
        <Loader />
      ) : (
        <Table.ScrollContainer minWidth={600}>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Título</Table.Th>
              <Table.Th>Responsável</Table.Th>
              <Table.Th>Premissa</Table.Th>
              <Table.Th>Horário</Table.Th>
              <Table.Th>Ativo</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(templatesQuery.data ?? []).map((template) => (
              <Table.Tr key={template.id}>
                <Table.Td>{template.title}</Table.Td>
                <Table.Td>
                  {template.responsibleId ? (userNameById.get(template.responsibleId) ?? '—') : '—'}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="workflow">
                    {formatBusinessDayRule(template.businessDayOffset)}
                  </Badge>
                </Table.Td>
                <Table.Td>{template.dueTime ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge color={template.isActive ? 'green' : 'gray'}>
                    {template.isActive ? 'Sim' : 'Não'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" onClick={() => openEditTemplate(template)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Table.ScrollContainer>
      )}

      <TemplateFormModal
        opened={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSubmit={handleTemplateSubmit}
        editing={editing}
        users={usersQuery.data ?? []}
        otherTemplates={(templatesQuery.data ?? []).filter((t) => t.id !== editing?.id)}
        initialDependsOnTemplateIds={editingDependsOn}
      />

      <CreateActivityModal
        opened={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSubmit={(dto) => createActivityMutation.mutate(dto)}
        users={usersQuery.data ?? []}
        projectId={fechamentoProjectId}
      />
    </>
  );
}
