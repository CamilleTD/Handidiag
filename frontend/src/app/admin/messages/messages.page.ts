import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { adminT } from '../admin-i18n';
import { ContactsEditor } from './contacts-editor/contacts-editor.component';
import { TextItemsEditor } from './text-items-editor/text-items-editor.component';

type Tab = 'flags' | 'suggestions' | 'contacts';

/** Messages et interlocuteurs partagés entre tous les questionnaires. */
@Component({
  imports: [TextItemsEditor, ContactsEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './messages.page.html',
  styleUrl: './messages.page.scss',
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
