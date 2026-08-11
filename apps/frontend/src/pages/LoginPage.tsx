import { Alert, Anchor, Button, Center, Paper, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { FormEvent, useState } from 'react';
import { Link, Location, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login, resendVerification, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: { from?: Location } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname ?? '/fechamento'} replace />;
  }

  const showResend = !!error && error.includes('verificado');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResendSent(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname ?? '/fechamento', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification(email);
      setResendSent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 380 }}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            <Text size="sm" ta="right">
              <Anchor component={Link} to="/forgot-password">
                Esqueci minha senha
              </Anchor>
            </Text>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            {showResend &&
              (resendSent ? (
                <Text size="sm" c="dimmed" ta="center">
                  Se o e-mail estiver cadastrado e pendente de verificação, um novo link foi enviado.
                </Text>
              ) : (
                <Button variant="subtle" size="compact-sm" onClick={handleResend} loading={resending}>
                  Reenviar e-mail de verificação
                </Button>
              ))}
            <Button type="submit" loading={loading} fullWidth mt="sm">
              Entrar
            </Button>
            <Text size="sm" ta="center">
              Não tem uma conta? <Anchor component={Link} to="/register">Criar conta</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
