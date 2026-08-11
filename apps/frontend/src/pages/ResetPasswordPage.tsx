import { Alert, Anchor, Button, Center, List, Paper, PasswordInput, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconCircleCheck, IconX } from '@tabler/icons-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PASSWORD_RULES } from '../auth/passwordRules';
import { BrasalLogo } from '../components/BrasalLogo';

const REDIRECT_SECONDS = 4;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { resetPassword, isAuthenticated } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!success) return;
    if (secondsLeft <= 0) {
      navigate('/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, secondsLeft, navigate]);

  if (isAuthenticated) {
    return <Navigate to="/fechamento" replace />;
  }

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const isPasswordStrong = passwordChecks.every((c) => c.passed);

  // No token to consume here (unlike VerifyEmailPage's mount-time effect) — the reset call only
  // fires from a user-triggered submit, so there's no StrictMode double-invoke to guard against.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);

    if (!isPasswordStrong) {
      setError('A senha não atende aos requisitos abaixo');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Center h="100vh" bg="var(--mantine-color-body)">
        <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 420 }}>
          <Stack align="center" mb="lg">
            <BrasalLogo />
          </Stack>
          <Stack>
            <Alert color="red" variant="light">
              Link de redefinição de senha inválido.
            </Alert>
            <Text size="sm" ta="center">
              <Anchor component={Link} to="/forgot-password">
                Solicitar um novo link
              </Anchor>
            </Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (success) {
    return (
      <Center h="100vh" bg="var(--mantine-color-body)">
        <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 420 }}>
          <Stack align="center" mb="lg">
            <BrasalLogo />
          </Stack>
          <Stack align="center">
            <ThemeIcon color="green" size={48} radius="xl" variant="light">
              <IconCircleCheck size={28} />
            </ThemeIcon>
            <Text fw={600} ta="center">
              Senha redefinida com sucesso!
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Redirecionando para o login em {secondsLeft}s...
            </Text>
            <Button onClick={() => navigate('/login', { replace: true })} fullWidth>
              Ir para o login agora
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 420 }}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Text fw={600} ta="center">
              Crie uma nova senha
            </Text>
            <PasswordInput
              label="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              autoFocus
            />
            {password.length > 0 && (
              <List spacing={4} size="sm" center>
                {passwordChecks.map((c) => (
                  <List.Item
                    key={c.label}
                    icon={
                      <ThemeIcon color={c.passed ? 'green' : 'red'} size={18} radius="xl" variant="light">
                        {c.passed ? <IconCheck size={12} /> : <IconX size={12} />}
                      </ThemeIcon>
                    }
                  >
                    <Text size="sm" c={c.passed ? undefined : 'dimmed'}>
                      {c.label}
                    </Text>
                  </List.Item>
                ))}
              </List>
            )}
            <PasswordInput
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={passwordsMismatch ? 'As senhas não coincidem' : undefined}
              required
            />
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <Button type="submit" loading={loading} fullWidth mt="sm" disabled={!isPasswordStrong || passwordsMismatch}>
              Redefinir senha
            </Button>
            <Text size="sm" ta="center">
              <Anchor component={Link} to="/login">
                Voltar para o login
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
