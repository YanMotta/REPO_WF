import { AppShell, NavLink, Text } from '@mantine/core';
import {
  IconCalendarStats,
  IconChecklist,
  IconFolders,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLogout,
  IconUsers,
} from '@tabler/icons-react';
import { Role } from '@workflow-brasal/shared';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrasalLogo } from '../components/BrasalLogo';

const NAV_ITEMS = [
  { label: 'Atividades', path: '/fechamento', icon: IconCalendarStats, adminOnly: false },
  { label: 'Dashboard', path: '/dashboard', icon: IconLayoutDashboard, adminOnly: true },
  { label: 'Quadro', path: '/quadro', icon: IconLayoutKanban, adminOnly: false },
  { label: 'Cronogramas', path: '/projetos', icon: IconFolders, adminOnly: true },
  { label: 'Checklist', path: '/modelos-fechamento', icon: IconChecklist, adminOnly: true },
  { label: 'Usuários', path: '/usuarios', icon: IconUsers, adminOnly: true },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const visibleNavItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <AppShell navbar={{ width: 240, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
        <BrasalLogo />
        <div style={{ marginTop: 24, flex: 1 }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
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
    </AppShell>
  );
}
