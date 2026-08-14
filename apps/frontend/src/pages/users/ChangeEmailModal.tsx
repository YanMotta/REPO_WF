import { Button, Modal, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ChangeEmailModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { user, changeEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setNewEmail('');
    setPassword('');
    onClose();
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await changeEmail(newEmail, password);
      notifications.show({ color: 'green', message: result.message });
      handleClose();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Não foi possível trocar o e-mail',
        message: err instanceof ApiError ? err.message : 'Erro inesperado',
      });
    } finally {
      setLoading(false);
    }
  }

  const isValid = isValidEmail(newEmail) && newEmail !== user?.email && password.length > 0;

  return (
    <Modal opened={opened} onClose={handleClose} title="Alterar e-mail">
      <Stack>
        <Text size="sm" c="dimmed">
          E-mail atual: {user?.email}
        </Text>
        <TextInput
          label="Novo e-mail"
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.currentTarget.value)}
        />
        <PasswordInput
          label="Senha atual"
          description="Confirme sua senha para autorizar a troca"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed">
          Enviaremos um link de confirmação para o novo e-mail. A troca só é efetivada depois que você clicar nele.
        </Text>
        <Button onClick={handleSubmit} disabled={!isValid} loading={loading}>
          Enviar link de confirmação
        </Button>
      </Stack>
    </Modal>
  );
}
