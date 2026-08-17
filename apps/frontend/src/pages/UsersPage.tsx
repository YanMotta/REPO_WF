import { ActionIcon, Badge, Button, Group, Loader, Table, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash, IconUserCheck } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, UserDto } from '@workflow-brasal/shared';
import { useState } from 'react';
import { ApiError } from '../api/client';
import { CreateUserInput, UpdateUserInput, createUser, listUsers, updateUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { CreateUserModal } from './users/CreateUserModal';
import { UserFormModal } from './users/UserFormModal';

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.MANAGER]: 'Gestor',
  [Role.MEMBER]: 'Usuário comum',
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });

  function handleMutationError(title: string) {
    return (err: unknown) =>
      notifications.show({
        color: 'red',
        title,
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      });
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormModalOpen(false);
      notifications.show({ color: 'green', message: 'Usuário atualizado com sucesso' });
    },
    onError: handleMutationError('Erro ao atualizar usuário'),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateModalOpen(false);
      notifications.show({ color: 'green', title: 'Usuário criado', message: result.message });
    },
    onError: handleMutationError('Erro ao criar usuário'),
  });

  function openEditUser(user: UserDto) {
    setEditing(user);
    setFormModalOpen(true);
  }

  function handleFormSubmit(input: UpdateUserInput) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, input });
    }
  }

  function toggleActive(user: UserDto) {
    if (user.isActive) {
      const confirmed = window.confirm(
        `Excluir o usuário "${user.name}"? A pessoa não conseguirá mais fazer login, mas pode ser reativada depois — o histórico de atividades dela é mantido.`,
      );
      if (!confirmed) return;
    }
    updateMutation.mutate({ id: user.id, input: { isActive: !user.isActive } });
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Usuários</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Novo usuário
        </Button>
      </Group>

      {usersQuery.isLoading ? (
        <Loader />
      ) : (
        <Table.ScrollContainer minWidth={600}>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>E-mail</Table.Th>
              <Table.Th>Perfil</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(usersQuery.data ?? []).map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.name}</Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="workflow">
                      {ROLE_LABEL[user.role]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'Ativo' : 'Inativo'}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" onClick={() => openEditUser(user)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={isSelf ? 'Você não pode alterar seu próprio acesso' : user.isActive ? 'Excluir' : 'Reativar'}>
                        <ActionIcon
                          variant="subtle"
                          color={user.isActive ? 'red' : 'green'}
                          disabled={isSelf}
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive ? <IconTrash size={16} /> : <IconUserCheck size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        </Table.ScrollContainer>
      )}

      <UserFormModal
        opened={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        user={editing}
      />
      <CreateUserModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(input) => createMutation.mutate(input)}
        isSaving={createMutation.isPending}
      />
    </>
  );
}
