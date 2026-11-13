import { Injectable, signal } from '@angular/core';

export type StatEvent =
  | { t: 'start'; lang: string }
  | { t: 'complete'; profile: string; level: string; lang: string }
  | { t: 'deep' }
  | { t: 'doc'; doc: string };

/** Compteurs anonymes : jamais de réponse individuelle, et rien si la personne s'y oppose. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  readonly enabled = signal(true);

  send(event: StatEvent): void {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (!this.enabled() || nav.doNotTrack === '1' || nav.globalPrivacyControl) return;
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: 'omit',
      cache: 'no-store',
    }).catch(() => undefined);
  }
}
