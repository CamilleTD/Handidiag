import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ContactsEditor } from '../restitution/contacts-editor.component';
import { LevelsEditor } from '../restitution/levels-editor.component';
import { PoleEditor } from '../restitution/pole-editor.component';
import { TextItemsEditor } from '../restitution/text-items-editor.component';

type Tab = 'levels' | 'flags' | 'suggestions' | 'pole' | 'contacts';

/** Tout ce qu'affiche la page « Votre orientation ». */
@Component({
  imports: [LevelsEditor, TextItemsEditor, PoleEditor, ContactsEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Restitution</h1>
    <p class="hint">
      Textes et interlocuteurs affichés à la fin du questionnaire. Chaque enregistrement est en
      ligne immédiatement.
    </p>
    <div class="tabs" role="tablist" aria-label="Parties de la restitution">
      @for (t of tabs; track t.id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + t.id"
          [attr.aria-selected]="tab() === t.id"
          [attr.aria-controls]="'panel-' + t.id"
          [tabIndex]="tab() === t.id ? 0 : -1"
          (click)="tab.set(t.id)"
          (keydown.arrowRight)="step(1)"
          (keydown.arrowLeft)="step(-1)"
        >
          {{ t.label }}
        </button>
      }
    </div>
    <div role="tabpanel" [id]="'panel-' + tab()" [attr.aria-labelledby]="'tab-' + tab()">
      @switch (tab()) {
        @case ('levels') {
          <app-levels-editor />
        }
        @case ('flags') {
          <app-text-items-editor
            collection="flags"
            intro="Affichés sous « Points d'attention pour vous », dans l'ordre ci-dessous, quand une règle les ajoute."
          />
        }
        @case ('suggestions') {
          <app-text-items-editor
            collection="suggestions"
            intro="Affichées sous « Pistes pour avancer », dans l'ordre où les règles les ajoutent."
          />
        }
        @case ('pole') {
          <app-pole-editor />
        }
        @case ('contacts') {
          <app-contacts-editor />
        }
      }
    </div>
  `,
})
export class RestitutionPage {
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'levels', label: 'Niveaux' },
    { id: 'flags', label: "Points d'attention" },
    { id: 'suggestions', label: 'Pistes' },
    { id: 'pole', label: 'Pôle handicap' },
    { id: 'contacts', label: 'Interlocuteurs' },
  ];
  protected readonly tab = signal<Tab>('levels');

  /** Flèches gauche/droite : onglet précédent/suivant (motif d'onglets ARIA). */
  protected step(delta: number): void {
    const index = this.tabs.findIndex((t) => t.id === this.tab());
    const next = this.tabs[(index + delta + this.tabs.length) % this.tabs.length];
    this.tab.set(next.id);
    queueMicrotask(() => document.getElementById(`tab-${next.id}`)?.focus());
  }
}
