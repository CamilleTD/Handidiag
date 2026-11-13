import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { QuizService } from './core/quiz.service';

export const routes: Routes = [
  {
    path: '',
    title: 'pages.info',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  { path: 'quiz', pathMatch: 'full', redirectTo: 'quiz/1' },
  {
    path: 'quiz/:number',
    title: 'pages.quiz',
    loadComponent: () => import('./pages/quiz/quiz.page').then((m) => m.QuizPage),
  },
  {
    path: 'more',
    title: 'pages.more',
    loadComponent: () => import('./pages/more/more.page').then((m) => m.MorePage),
  },
  {
    path: 'result',
    title: 'pages.result',
    // Pas de résultat sans avoir répondu : retour à l'accueil
    canActivate: [() => !!inject(QuizService).result() || inject(Router).parseUrl('/')],
    loadComponent: () => import('./pages/result/result.page').then((m) => m.ResultPage),
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
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
