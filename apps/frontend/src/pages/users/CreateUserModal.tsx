import { Button, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { Role } from '@workflow-brasal/shared';
import { useState } from 'react';
import { CreateUserInput } from '../../api/users';

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.MANAGER, label: 'Gestor' },
  { value: Role.MEMBER, label: 'Usuário comum' },
];

/**
 * Audit finding #4 — previously the only way an account could exist was self-registration.
 * This creates it directly and already active/verified; the new person gets an e-mail to set
 * their own password (see AuthService.createUserByAdmin), so nobody here ever sees or picks it.
 */
export function CreateUserModal({
  opened,
  onClose,
  onSubmit,
  isSaving,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: CreateUserInput) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.MEMBER);

  function reset() {
    setName('');
    setEmail('');
    setRole(Role.MEMBER);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({ name: name.trim(), email: email.trim(), role });
    reset();
  }

  const isValid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);

  return (
    <Modal opened={opened} onClose={handleClose} title="Criar usuário">
      <Stack>
        <TextInput
          label="Nome completo"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          autoFocus
        />
        <TextInput
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <Select
          label="Perfil"
          data={ROLE_OPTIONS}
          value={role}
          onChange={(v) => v && setRole(v as Role)}
          allowDeselect={false}
        />
        <Text size="xs" c="dimmed">
          A pessoa recebe um e-mail para definir a própria senha — ninguém escolhe uma senha por
          ela.
        </Text>
        <Button onClick={handleSubmit} disabled={!isValid} loading={isSaving}>
          Criar
        </Button>
      </Stack>
    </Modal>
  );
}
