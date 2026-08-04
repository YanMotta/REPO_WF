import { Button, Modal, PasswordInput, Stack } from '@mantine/core';
import { UserDto } from '@workflow-brasal/shared';
import { useEffect, useState } from 'react';

export function ResetPasswordModal({
  opened,
  onClose,
  onSubmit,
  user,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
  user: UserDto | null;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
  }, [opened, user]);

  const isValid = password.length >= 8 && password === confirmPassword;

  return (
    <Modal opened={opened} onClose={onClose} title={user ? `Redefinir senha — ${user.name}` : 'Redefinir senha'}>
      <Stack>
        <PasswordInput
          label="Nova senha"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <PasswordInput
          label="Confirmar nova senha"
          required
          value={confirmPassword}
          error={confirmPassword.length > 0 && confirmPassword !== password ? 'As senhas não coincidem' : undefined}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        />
        <Button onClick={() => onSubmit(password)} disabled={!isValid}>
          Redefinir senha
        </Button>
      </Stack>
    </Modal>
  );
}
