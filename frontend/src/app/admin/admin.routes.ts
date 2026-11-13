import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { AdminApi } from './admin-api.service';
import { AdminShell } from './admin-shell.component';

/** Charge les textes de l'administration (français et anglais) avant le premier écran. */
const adminTexts: CanActivateFn = async () => {
  await inject(I18nService).loadNamespace('admin');
  return true;
};

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

const page = (path: string, title: string, load: () => Promise<unknown>) => ({
  path,
  title: `admin.titles.${title}`,
  loadComponent: load as never,
});

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [adminTexts],
    children: [
      page('login', 'login', () => import('./pages/login.page').then((m) => m.LoginPage)),
      {
        path: '',
        component: AdminShell,
        canActivate: [signedIn],
        canActivateChild: [signedIn],
        children: [
          page('', 'dashboard', () =>
            import('./pages/dashboard.page').then((m) => m.DashboardPage),
          ),
          page('questionnaires', 'questionnaires', () =>
            import('./questionnaires/questionnaires.page').then((m) => m.QuestionnairesPage),
          ),
          page('questionnaires/:id', 'builder', () =>
            import('./questionnaires/builder.page').then((m) => m.BuilderPage),
          ),
          page('library/questions', 'questions', () =>
            import('./library/questions.page').then((m) => m.QuestionsPage),
          ),
          page('library/questions/:id', 'question', () =>
            import('./library/question-editor.page').then((m) => m.QuestionEditorPage),
          ),
          page('library/rules', 'rules', () =>
            import('./library/rules.page').then((m) => m.RulesPage),
          ),
          page('library/rules/:id', 'rule', () =>
            import('./library/rule-editor.page').then((m) => m.RuleEditorPage),
          ),
          page('library/messages', 'messages', () =>
            import('./messages/messages.page').then((m) => m.MessagesPage),
          ),
          page('pages', 'pages', () =>
            import('./pages/content-pages.page').then((m) => m.ContentPagesPage),
          ),
          page('pages/:id', 'page', () =>
            import('./pages/page-editor.page').then((m) => m.PageEditorPage),
          ),
          page('resources', 'resources', () =>
            import('./pages/resources.page').then((m) => m.ResourcesAdminPage),
          ),
          page('account', 'account', () =>
            import('./pages/account.page').then((m) => m.AccountPage),
          ),
        ],
      },
    ],
  },
];
