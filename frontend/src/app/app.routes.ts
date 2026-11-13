import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, Routes } from '@angular/router';
import { ContentService } from './core/content.service';
import { QuizService } from './core/quiz.service';

/** Charge le questionnaire de l'adresse ; inconnu ou non publié : retour à l'accueil. */
const questionnaireLoaded: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const ok = await inject(QuizService).ensure(route.paramMap.get('key') ?? '');
  return ok || inject(Router).parseUrl('/');
};

/** Pas de résultat sans avoir répondu : retour au début du questionnaire. */
const hasResult: CanActivateFn = (route: ActivatedRouteSnapshot) =>
  !!inject(QuizService).result() ||
  inject(Router).createUrlTree(['/q', route.paramMap.get('key'), 1]);

/** Ancienne adresse /quiz : questionnaire mis en avant. */
const featured: CanActivateFn = () => {
  const key = inject(ContentService).featured()?.key;
  return inject(Router).createUrlTree(key ? ['/q', key, 1] : ['/']);
};

export const routes: Routes = [
  {
    path: '',
    title: 'pages.info',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  { path: 'quiz', canActivate: [featured], children: [] },
  { path: 'q/:key', pathMatch: 'full', redirectTo: 'q/:key/1' },
  {
    path: 'q/:key/more',
    title: 'pages.more',
    canActivate: [questionnaireLoaded],
    loadComponent: () => import('./pages/more/more.page').then((m) => m.MorePage),
  },
  {
    path: 'q/:key/result',
    title: 'pages.result',
    canActivate: [questionnaireLoaded, hasResult],
    loadComponent: () => import('./pages/result/result.page').then((m) => m.ResultPage),
  },
  {
    path: 'q/:key/:number',
    title: 'pages.quiz',
    canActivate: [questionnaireLoaded],
    loadComponent: () => import('./pages/quiz/quiz.page').then((m) => m.QuizPage),
  },
  {
    path: 'preview/:id',
    title: 'pages.quiz',
    loadComponent: () => import('./pages/preview/preview.page').then((m) => m.PreviewPage),
  },
  {
    path: 'kit',
    title: 'pages.kit',
    loadComponent: () => import('./pages/kit/kit.page').then((m) => m.KitPage),
  },
  {
    path: 'resources',
    title: 'pages.resources',
    loadComponent: () => import('./pages/resources/resources.page').then((m) => m.ResourcesPage),
  },
  {
    path: 'info',
    pathMatch: 'full',
    title: 'pages.info_pages',
    loadComponent: () => import('./pages/info/info.page').then((m) => m.InfoPage),
  },
  {
    path: 'info/:slug',
    title: 'pages.info_pages',
    loadComponent: () => import('./pages/info/info.page').then((m) => m.InfoPage),
  },
  {
    path: 'settings',
    title: 'pages.settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'admin',
    title: 'pages.admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    title: 'pages.not_found',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
