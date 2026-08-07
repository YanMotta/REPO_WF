import { Alert, Anchor, Button, Center, List, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

const PASSWORD_RULES = [
  { label: 'Pelo menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Uma letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Um número', test: (v: string) => /\d/.test(v) },
  { label: 'Um caractere especial (@, #, $...)', test: (v: string) => /[^A-Za-z0-9\s]/.test(v) },
];

export function RegisterPage() {
  const { register, resendVerification, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/fechamento" replace />;
  }

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const isPasswordStrong = passwordChecks.every((c) => c.passed);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      await register(name, email, password);
      setRegisteredEmail(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!registeredEmail) return;
    setResending(true);
    try {
      await resendVerification(registeredEmail);
    } finally {
      setResending(false);
    }
  }

  if (registeredEmail) {
    return (
      <Center h="100vh" bg="var(--mantine-color-body)">
        <Paper withBorder shadow="md" p={30} radius="md" w={420}>
          <Stack align="center" mb="lg">
            <BrasalLogo />
          </Stack>
          <Stack>
            <Text fw={600} ta="center">
              Cadastro realizado!
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Enviamos um link de confirmação para <strong>{registeredEmail}</strong>. Verifique sua caixa de
              entrada (e o spam) — o link expira em 30 minutos.
            </Text>
            <Button variant="default" onClick={handleResend} loading={resending}>
              Reenviar e-mail
            </Button>
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
      <Paper withBorder shadow="md" p={30} radius="md" w={420}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Nome completo"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              autoFocus
            />
            <TextInput
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
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
              label="Confirmar senha"
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
              Criar conta
            </Button>
            <Text size="sm" ta="center">
              Já tem uma conta? <Anchor component={Link} to="/login">Entrar</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
