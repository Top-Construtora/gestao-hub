import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { HomePageComponent } from './components/home-page/home-page';
import { AnalyticsPageComponent } from './components/analytics-page/analytics-page';
import { ChangePasswordComponent } from './components/change-password/change-password';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
// Dashboard, Reports and Analytics removed
import { UsersPageComponent } from './components/users-page/users-page';
import { NewUserPageComponent } from './components/new-user-page/new-user-page';
import { SettingsPageComponent } from './components/settings-page/settings-page';
import { HelpPageComponent } from './components/help-page/help-page';
import { AccessDeniedComponent } from './pages/access-denied/access-denied';
import { AuthGuard } from './guards/auth-guard';
import { MustChangePasswordGuard } from './guards/must-change-password-guard';
import { AdminGuard } from './guards/admin-guard';
import { AdminOnlyGuard } from './guards/admin-only-guard';
import { AdminGerencialGuard } from './guards/admin-gerencial-guard';
import { UserGuard } from './guards/user-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },

  // Rotas de recuperação de senha - públicas
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Esqueci minha senha - HUB CRM',
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    title: 'Nova senha - HUB CRM',
  },

  // Rota de acesso negado
  {
    path: 'access-denied',
    component: AccessDeniedComponent,
    title: 'Acesso Negado - HUB CRM',
  },

  // Rota para trocar senha - protegida apenas por autenticação
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [AuthGuard],
    title: 'Alterar Senha - HUB CRM',
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard, MustChangePasswordGuard],
    children: [
      // Rota padrão dentro de /home redireciona para a página inicial
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },

      // Página inicial/Dashboard
      {
        path: 'inicio',
        component: HomePageComponent,
        title: 'Início - HUB CRM',
      },

      // Analytics
      {
        path: 'analytics',
        component: AnalyticsPageComponent,
        title: 'Analytics - HUB CRM',
      },

      // Gestão de usuários - Admin Gerencial pode APENAS visualizar
      {
        path: 'usuarios',
        component: UsersPageComponent,
        canActivate: [AdminGerencialGuard],
        title: 'Usuários - HUB CRM',
      },

      // Novo usuário - APENAS Admin
      {
        path: 'usuarios/novo',
        component: NewUserPageComponent,
        canActivate: [AdminOnlyGuard],
        title: 'Novo Usuário - HUB CRM',
      },

      // Editar usuário - APENAS Admin
      {
        path: 'usuarios/editar/:id',
        component: NewUserPageComponent,
        canActivate: [AdminOnlyGuard],
        title: 'Editar Usuário - HUB CRM',
      },

      // Configurações do sistema
      {
        path: 'configuracoes',
        component: SettingsPageComponent,
        title: 'Configurações - HUB CRM',
      },

      // Ajuda e suporte
      {
        path: 'ajuda',
        component: HelpPageComponent,
        title: 'Ajuda - HUB CRM',
      },

      // Redirecionamentos para compatibilidade com rotas antigas
      { path: 'users', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'users/new', redirectTo: 'usuarios/novo', pathMatch: 'full' },
      { path: 'users/edit/:id', redirectTo: 'usuarios/editar/:id', pathMatch: 'full' },

      { path: 'settings', redirectTo: 'configuracoes', pathMatch: 'full' },
      { path: 'help', redirectTo: 'ajuda', pathMatch: 'full' },
    ],
  },

  // Rota wildcard para páginas não encontradas - redireciona para login
  {
    path: '**',
    redirectTo: '/login',
  },
];
