import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketPredictionPage } from './pages/TicketPredictionPage';
import { RankingPage } from './pages/RankingPage';
import { TicketBreakdownPage } from './pages/TicketBreakdownPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminSalesPage } from './pages/AdminSalesPage';
import { AdminTicketsPage } from './pages/AdminTicketsPage';
import { AdminResultsPage } from './pages/AdminResultsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';

// Suscripción al hashchange como external store. Evita tearing en renders concurrentes
// y elimina el patrón frágil useState(currentRoute()) + useEffect(subscribe).
function getRoute() {
  return window.location.hash || '#/dashboard';
}
function subscribeRoute(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export default function App() {
  const route = useSyncExternalStore(subscribeRoute, getRoute);
  const auth = useAuth();

  function navigate(to: string) {
    window.location.hash = to.replace(/^#?/, '#');
    // El listener de hashchange dispara la actualización; no necesitamos setState manual.
  }

  // Si ya hay sesión y estamos en login/register, mandamos al dashboard.
  useEffect(() => {
    if (auth.user && (route === '#/login' || route === '#/register')) {
      window.location.hash = '#/dashboard';
    }
  }, [auth.user, route]);

  // Tras cerrar sesión, mandamos al login.
  async function handleSignOut() {
    await auth.signOut();
    window.location.hash = '#/login';
  }

  const content = useMemo(() => {
    if (route === '#/login') return <LoginPage onLogin={auth.signIn} onNavigate={navigate} loading={auth.loading} error={auth.error} />;
    if (route === '#/register') return <RegisterPage onRegister={auth.register} onNavigate={navigate} loading={auth.loading} error={auth.error} />;
    if (route === '#/ranking') return <RankingPage onNavigate={navigate} />;

    // Detalle de un ticket (predicho vs real + desglose de puntos). Público para que
    // cualquiera con el link pueda ver pero los datos sensibles están enmascarados.
    const breakdownMatch = route.match(/^#\/tickets\/([^/]+)\/breakdown$/);
    if (breakdownMatch) {
      return <TicketBreakdownPage ticketId={breakdownMatch[1]} onNavigate={navigate} />;
    }

    if (route.startsWith('#/prediction/')) {
      const ticketId = route.split('/').pop() ?? '';
      return <ProtectedRoute user={auth.user} onLogin={() => navigate('#/login')}><TicketPredictionPage ticketId={ticketId} /></ProtectedRoute>;
    }

    // Admin edita la predicción de un ticket ajeno (TTHH transcribe del PDF llenado a mano).
    const adminEditMatch = route.match(/^#\/admin\/tickets\/([^/]+)\/edit$/);
    if (adminEditMatch) {
      const ticketId = adminEditMatch[1];
      return <AdminRoute user={auth.user}><TicketPredictionPage ticketId={ticketId} adminMode /></AdminRoute>;
    }

    if (route === '#/admin') return <AdminRoute user={auth.user}><AdminHomePage onNavigate={navigate} /></AdminRoute>;
    if (route === '#/admin/sales') return <AdminRoute user={auth.user}><AdminSalesPage onNavigate={navigate} /></AdminRoute>;
    if (route === '#/admin/tickets') return <AdminRoute user={auth.user}><AdminTicketsPage onNavigate={navigate} /></AdminRoute>;
    if (route === '#/admin/results') return <AdminRoute user={auth.user}><AdminResultsPage onNavigate={navigate} /></AdminRoute>;

    if (route === '#/dashboard' || route === '#/') {
      return <ProtectedRoute user={auth.user} onLogin={() => navigate('#/login')}>{auth.user && <DashboardPage user={auth.user} onNavigate={navigate} />}</ProtectedRoute>;
    }

    return <NotFoundPage onNavigate={navigate} />;
  }, [route, auth.user, auth.loading, auth.error]);

  return <AppShell user={auth.user} onNavigate={navigate} onSignOut={() => void handleSignOut()}>{content}</AppShell>;
}
