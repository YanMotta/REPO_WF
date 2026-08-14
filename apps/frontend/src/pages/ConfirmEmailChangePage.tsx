import { Alert, Anchor, Button, Center, Loader, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

type Status = 'loading' | 'success' | 'error';

const REDIRECT_SECONDS = 4;

export function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { confirmEmailChange, logout } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const confirmAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Link de confirmação inválido.');
      return;
    }
    // Consuming the token is a one-shot, non-idempotent side effect — same StrictMode
    // double-invoke guard as VerifyEmailPage.
    if (confirmAttempted.current) return;
    confirmAttempted.current = true;

    confirmEmailChange(token)
      .then(() => {
        // The e-mail (a login credential) just changed — same reasoning as ResetPasswordPage:
        // drop any existing session so the next login is explicit, with the new e-mail.
        logout();
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Erro ao confirmar a troca de e-mail');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;
    if (secondsLeft <= 0) {
      navigate('/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft, navigate]);

  return (
    <Center h="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 420 }}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>

        {status === 'loading' && (
          <Stack align="center">
            <Loader />
            <Text size="sm" c="dimmed">
              Confirmando a troca de e-mail, aguarde...
            </Text>
          </Stack>
        )}

        {status === 'success' && (
          <Stack align="center">
            <ThemeIcon color="green" size={48} radius="xl" variant="light">
              <IconCircleCheck size={28} />
            </ThemeIcon>
            <Text fw={600} ta="center">
              E-mail atualizado com sucesso!
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Faça login novamente com o novo e-mail. Redirecionando em {secondsLeft}s...
            </Text>
            <Button onClick={() => navigate('/login', { replace: true })} fullWidth>
              Ir para o login agora
            </Button>
          </Stack>
        )}

        {status === 'error' && (
          <Stack>
            <Alert color="red" variant="light">
              {error}
            </Alert>
            <Text size="sm" ta="center">
              <Anchor component={Link} to="/login">
                Voltar para o login
              </Anchor>
            </Text>
          </Stack>
        )}
      </Paper>
    </Center>
  );
}
