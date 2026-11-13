import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AppState } from './core/app-state.service';
import { PageTitleStrategy } from './core/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    // Textes et contenu chargés avant le premier affichage ; une erreur affiche un message
    provideAppInitializer(() => inject(AppState).load()),
  ],
};
