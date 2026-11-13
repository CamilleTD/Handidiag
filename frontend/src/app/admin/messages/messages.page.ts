import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { adminT } from '../admin-i18n';
import { ContactsEditor } from './contacts-editor.component';
import { TextItemsEditor } from './text-items-editor.component';

type Tab = 'flags' | 'suggestions' | 'contacts';

/** Messages et interlocuteurs partagés entre tous les questionnaires. */
@Component({
  imports: [TextItemsEditor, ContactsEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ t('messages.title') }}</h1>
    <p class="hint">{{ t('messages.intro') }}</p>
    <div class="tabs" role="tablist" [attr.aria-label]="t('messages.title')">
      @for (id of tabs; track id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + id"
          [attr.aria-selected]="tab() === id"
          [attr.aria-controls]="'panel-' + id"
          [tabIndex]="tab() === id ? 0 : -1"
          (click)="tab.set(id)"
          (keydown.arrowRight)="step(1)"
          (keydown.arrowLeft)="step(-1)"
        >
          {{ t('messages.tab_' + id) }}
        </button>
      }
    </div>
    <div role="tabpanel" [id]="'panel-' + tab()" [attr.aria-labelledby]="'tab-' + tab()">
      @switch (tab()) {
        @case ('flags') {
          <app-text-items-editor collection="flags" />
        }
        @case ('suggestions') {
          <app-text-items-editor collection="suggestions" />
        }
        @case ('contacts') {
          <app-contacts-editor />
        }
      }
    </div>
  `,
})
export class MessagesPage {
  protected readonly t = adminT();
  protected readonly tabs: Tab[] = ['flags', 'suggestions', 'contacts'];
  protected readonly tab = signal<Tab>('flags');

  /** Flèches gauche/droite : onglet précédent/suivant (motif d'onglets ARIA). */
  protected step(delta: number): void {
    const index = this.tabs.indexOf(this.tab());
    const next = this.tabs[(index + delta + this.tabs.length) % this.tabs.length];
    this.tab.set(next);
    queueMicrotask(() => document.getElementById(`tab-${next}`)?.focus());
  }
}
