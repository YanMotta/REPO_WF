import { AppShell, Box, Burger, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendarStats,
  IconChecklist,
  IconFolders,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLogout,
  IconMail,
  IconTimeline,
  IconUsers,
} from '@tabler/icons-react';
import { Role } from '@workflow-brasal/shared';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';
import { ChangeEmailModal } from '../pages/users/ChangeEmailModal';

const NAV_ITEMS = [
  { label: 'Checklist', path: '/modelos-fechamento', icon: IconChecklist, adminOnly: true },
  { label: 'Atividades', path: '/fechamento', icon: IconCalendarStats, adminOnly: false },
  { label: 'Dashboard', path: '/dashboard', icon: IconLayoutDashboard, adminOnly: true },
  { label: 'Quadro', path: '/quadro', icon: IconLayoutKanban, adminOnly: false },
  { label: 'Cronogramas', path: '/projetos', icon: IconFolders, adminOnly: true },
  { label: 'Gantt', path: '/gantt', icon: IconTimeline, adminOnly: false },
  { label: 'Usuários', path: '/usuarios', icon: IconUsers, adminOnly: true },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const visibleNavItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [changeEmailOpened, setChangeEmailOpened] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function goTo(path: string) {
    navigate(path);
    closeMobile();
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding="md"
    >
      <AppShell.Header hiddenFrom="sm">
        <Group h="100%" px="md" justify="space-between">
          <BrasalLogo />
          <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
        <Box visibleFrom="sm">
          <BrasalLogo />
        </Box>
        <div style={{ marginTop: 24, flex: 1 }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => goTo(item.path)}
              variant="filled"
              style={{ borderRadius: 8, marginBottom: 4 }}
            />
          ))}
        </div>
        {user && (
          <div>
            <Text size="xs" c="dimmed" mb={4} truncate>
              {user.name}
            </Text>
            <NavLink
              label="Alterar e-mail"
              leftSection={<IconMail size={18} />}
              onClick={() => setChangeEmailOpened(true)}
              style={{ borderRadius: 8, marginBottom: 4 }}
            />
            <NavLink
              label="Sair"
              leftSection={<IconLogout size={18} />}
              onClick={handleLogout}
              style={{ borderRadius: 8 }}
            />
          </div>
        )}
      </AppShell.Navbar>
      <AppShell.Main bg="var(--mantine-color-body)">
        <Outlet />
      </AppShell.Main>

      <ChangeEmailModal opened={changeEmailOpened} onClose={() => setChangeEmailOpened(false)} />
    </AppShell>
  );
}
