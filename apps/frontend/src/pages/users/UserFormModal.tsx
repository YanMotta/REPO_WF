import { Button, Modal, PasswordInput, Select, Stack, TextInput } from '@mantine/core';
import { Role, UserDto } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';
import { CreateUserInput, UpdateUserInput } from '../../api/users';

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.MANAGER, label: 'Gestor' },
  { value: Role.MEMBER, label: 'Usuário comum' },
];

interface FormShape {
  name: string;
  email: string;
  role: Role;
  password: string;
  confirmPassword: string;
}

function emptyForm(): FormShape {
  return { name: '', email: '', role: Role.MEMBER, password: '', confirmPassword: '' };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function UserFormModal({
  opened,
  onClose,
  onSubmit,
  editing,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: CreateUserInput | UpdateUserInput) => void;
  editing: UserDto | null;
}) {
  const [form, setForm] = useState<FormShape>(emptyForm());

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, email: editing.email, role: editing.role, password: '', confirmPassword: '' });
    } else {
      setForm(emptyForm());
    }
  }, [editing, opened]);

  function handleSubmit() {
    if (editing) {
      onSubmit({ name: form.name, email: form.email, role: form.role } satisfies UpdateUserInput);
    } else {
      onSubmit({
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password,
      } satisfies CreateUserInput);
    }
  }

  const isValid =
    form.name.trim().length >= 2 &&
    isValidEmail(form.email) &&
    (editing || (form.password.length >= 8 && form.password === form.confirmPassword));

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? 'Editar usuário' : 'Novo usuário'}>
      <Stack>
        <TextInput
          label="Nome completo"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
        />
        <TextInput
          label="E-mail"
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
        />
        <Select
          label="Perfil"
          data={ROLE_OPTIONS}
          value={form.role}
          onChange={(v) => v && setForm({ ...form, role: v as Role })}
          allowDeselect={false}
        />
        {!editing && (
          <>
            <PasswordInput
              label="Senha"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.currentTarget.value })}
            />
            <PasswordInput
              label="Confirmar senha"
              required
              value={form.confirmPassword}
              error={
                form.confirmPassword.length > 0 && form.confirmPassword !== form.password
                  ? 'As senhas não coincidem'
                  : undefined
              }
              onChange={(e) => setForm({ ...form, confirmPassword: e.currentTarget.value })}
            />
          </>
        )}
        <Button onClick={handleSubmit} disabled={!isValid}>
          Salvar
        </Button>
      </Stack>
    </Modal>
  );
}
