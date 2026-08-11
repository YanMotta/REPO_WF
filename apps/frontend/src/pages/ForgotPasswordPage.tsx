import { Anchor, Button, Center, Paper, Stack, Text, TextInput } from '@mantine/core';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

export function ForgotPasswordPage() {
  const { forgotPassword, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/fechamento" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } finally {
      setLoading(false);
      // Always shown, regardless of the API's outcome — the endpoint itself never reveals
      // whether the e-mail exists, so there's nothing to branch on here either.
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Center h="100vh" bg="var(--mantine-color-body)">
        <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 420 }}>
          <Stack align="center" mb="lg">
            <BrasalLogo />
          </Stack>
          <Stack>
            <Text fw={600} ta="center">
              Verifique seu e-mail
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha. Verifique sua caixa de entrada
              (e o spam).
            </Text>
            <Text size="sm" ta="center">
              <Anchor component={Link} to="/login">
                Voltar para o login
              </Anchor>
            </Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 380 }}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Text size="sm" c="dimmed">
              Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
            </Text>
            <TextInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoFocus
            />
            <Button type="submit" loading={loading} fullWidth mt="sm">
              Enviar link de redefinição
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
