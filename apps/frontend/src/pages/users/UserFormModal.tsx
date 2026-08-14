import { Button, Modal, Select, Stack, TextInput } from '@mantine/core';
import { Role, UserDto } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';
import { UpdateUserInput } from '../../api/users';

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.MANAGER, label: 'Gestor' },
  { value: Role.MEMBER, label: 'Usuário comum' },
];

interface FormShape {
  name: string;
  role: Role;
}

export function UserFormModal({
  opened,
  onClose,
  onSubmit,
  user,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateUserInput) => void;
  user: UserDto | null;
}) {
  const [form, setForm] = useState<FormShape>({ name: '', role: Role.MEMBER });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, role: user.role });
    }
  }, [user, opened]);

  function handleSubmit() {
    onSubmit(form);
  }

  const isValid = form.name.trim().length >= 2;

  return (
    <Modal opened={opened} onClose={onClose} title="Editar usuário">
      <Stack>
        <TextInput
          label="Nome completo"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
        />
        {user && (
          <TextInput label="E-mail" value={user.email} disabled description="Só o próprio usuário pode alterar o e-mail" />
        )}
        <Select
          label="Perfil"
          data={ROLE_OPTIONS}
          value={form.role}
          onChange={(v) => v && setForm({ ...form, role: v as Role })}
          allowDeselect={false}
        />
        <Button onClick={handleSubmit} disabled={!isValid}>
          Salvar
        </Button>
      </Stack>
    </Modal>
  );
}
