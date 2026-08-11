import { Alert, Anchor, Button, Center, Loader, Paper, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

type Status = 'loading' | 'success' | 'error';

const REDIRECT_SECONDS = 4;

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Link de verificação inválido.');
      return;
    }
    // Consuming the token is a one-shot, non-idempotent side effect — a second call for the
    // same token (StrictMode's dev double-invoke, or any accidental re-run) would find the
    // token already cleared and wrongly report it as invalid.
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Erro ao confirmar e-mail');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;
    if (secondsLeft <= 0) {
      navigate('/fechamento', { replace: true });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft, navigate]);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    setResending(true);
    try {
      await resendVerification(resendEmail);
      setResendSent(true);
    } finally {
      setResending(false);
    }
  }

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
              Verificando seu e-mail, aguarde...
            </Text>
          </Stack>
        )}

        {status === 'success' && (
          <Stack align="center">
            <ThemeIcon color="green" size={48} radius="xl" variant="light">
              <IconCircleCheck size={28} />
            </ThemeIcon>
            <Text fw={600} ta="center">
              E-mail confirmado com sucesso!
            </Text>
            <Text size="sm" ta="center" c="dimmed">
              Sua conta foi ativada. Redirecionando em {secondsLeft}s...
            </Text>
            <Button onClick={() => navigate('/fechamento', { replace: true })} fullWidth>
              Ir para o sistema agora
            </Button>
          </Stack>
        )}

        {status === 'error' && (
          <Stack>
            <Alert color="red" variant="light">
              {error}
            </Alert>
            {resendSent ? (
              <Text size="sm" ta="center" c="dimmed">
                Se o e-mail estiver cadastrado e pendente de verificação, um novo link foi enviado.
              </Text>
            ) : (
              <form onSubmit={handleResend}>
                <Stack>
                  <TextInput
                    label="E-mail"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.currentTarget.value)}
                    required
                  />
                  <Button type="submit" loading={resending} fullWidth>
                    Reenviar e-mail de verificação
                  </Button>
                </Stack>
              </form>
            )}
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
