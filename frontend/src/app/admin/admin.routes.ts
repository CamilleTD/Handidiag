import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AdminApi } from './admin-api.service';
import { AdminShell } from './admin-shell.component';

/** Accès réservé aux comptes connectés ; un mot de passe provisoire doit d'abord être changé. */
const signedIn: CanActivateFn = async (_route, state) => {
  const api = inject(AdminApi);
  const router = inject(Router);
  const admin = api.admin() ?? (await api.me());
  if (!admin) return router.createUrlTree(['/admin/login']);
  if (admin.must_change_password && !state.url.startsWith('/admin/account'))
    return router.createUrlTree(['/admin/account']);
  return true;
};

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AdminShell,
    canActivate: [signedIn],
    canActivateChild: [signedIn],
    children: [
      {
        path: '',
        title: 'Tableau de bord',
        loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'questions',
        title: 'Questions',
        loadComponent: () => import('./pages/questions.page').then((m) => m.QuestionsPage),
      },
      {
        path: 'questions/:id',
        title: 'Modifier une question',
        loadComponent: () =>
          import('./pages/question-editor.page').then((m) => m.QuestionEditorPage),
      },
      {
        path: 'rules',
        title: 'Règles',
        loadComponent: () => import('./pages/rules.page').then((m) => m.RulesPage),
      },
      {
        path: 'rules/:id',
        title: 'Modifier une règle',
        loadComponent: () => import('./pages/rule-editor.page').then((m) => m.RuleEditorPage),
      },
      {
        path: 'restitution',
        title: 'Restitution',
        loadComponent: () => import('./pages/restitution.page').then((m) => m.RestitutionPage),
      },
      {
        path: 'account',
        title: 'Mon compte',
        loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage),
      },
    ],
  },
];
