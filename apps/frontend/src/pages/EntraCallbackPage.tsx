import { Alert, Anchor, Center, Loader, Paper, Stack, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

type Status = 'loading' | 'error';

/** Lands here after the user authenticates with Microsoft and gets redirected back with either
 * `?code=...` (success — exchange it for our own session) or `?error=...` (they cancelled, or
 * something went wrong on Microsoft's side before it ever reached us). */
export function EntraCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithEntra } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const loginAttempted = useRef(false);

  useEffect(() => {
    const microsoftError = searchParams.get('error_description') ?? searchParams.get('error');
    const code = searchParams.get('code');

    if (microsoftError) {
      setStatus('error');
      setError(microsoftError);
      return;
    }
    if (!code) {
      setStatus('error');
      setError('Resposta inválida do login com a Microsoft.');
      return;
    }
    // The code is single-use — same StrictMode double-invoke guard as VerifyEmailPage.
    if (loginAttempted.current) return;
    loginAttempted.current = true;

    loginWithEntra(code)
      .then(() => navigate('/fechamento', { replace: true }))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Erro ao entrar com a Microsoft');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Center h="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" p={{ base: 20, sm: 30 }} radius="md" w={{ base: '92%', sm: 380 }}>
        <Stack align="center" mb="lg">
          <BrasalLogo />
        </Stack>

        {status === 'loading' && (
          <Stack align="center">
            <Loader />
            <Text size="sm" c="dimmed">
              Entrando com a Microsoft, aguarde...
            </Text>
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
