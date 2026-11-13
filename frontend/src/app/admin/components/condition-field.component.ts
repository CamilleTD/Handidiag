import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import type { Condition, Question } from '../../core/models';
import { describe, emptyLeaf } from '../conditions';
import { ConditionEditorComponent } from './condition-editor.component';

let nextId = 0;

/**
 * Bloc « condition » d'un formulaire : résumé lisible, éditeur visuel et, pour les cas
 * complexes, édition directe du JSON (validée par le serveur à l'enregistrement).
 */
@Component({
  selector: 'app-condition-field',
  imports: [ConditionEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form-section" [attr.aria-labelledby]="id">
      <h2 [id]="id">{{ label() }}</h2>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
      @if (optional()) {
        <label class="check">
          <input type="checkbox" [checked]="!!value()" (change)="toggle($event)" />
          <span>{{ optionalLabel() }}</span>
        </label>
      }
      @if (value(); as condition) {
        <p class="condition-summary"><strong>En clair :</strong> {{ summary() }}</p>
        @if (json() === null) {
          <app-condition-editor
            [condition]="condition"
            (conditionChange)="value.set($event)"
            [questions]="questions()"
          />
          <button type="button" class="linklike" (click)="openJson()">Modifier en JSON</button>
        } @else {
          <label class="field-label" [for]="id + '-json'">Condition au format JSON</label>
          <textarea
            [id]="id + '-json'"
            class="text-input json-view"
            [value]="json()"
            (input)="json.set(text($event))"
          ></textarea>
          @if (jsonError()) {
            <p class="error" role="alert">{{ jsonError() }}</p>
          }
          <div class="cond-row">
            <button type="button" class="btn btn-small" (click)="applyJson()">
              Appliquer le JSON
            </button>
            <button type="button" class="btn btn-small btn-quiet" (click)="json.set(null)">
              Revenir à l'éditeur visuel
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class ConditionFieldComponent {
  readonly value = model<Condition | null>(null);
  readonly questions = input.required<Question[]>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly optional = input(false);
  readonly optionalLabel = input('Sous condition');
  protected readonly id = `cf-${nextId++}`;
  protected readonly json = signal<string | null>(null);
  protected readonly jsonError = signal('');
  protected readonly summary = computed(() => describe(this.value(), this.questions()));

  protected text(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  protected toggle(event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.value.set(on ? emptyLeaf(this.questions()) : null);
    this.json.set(null);
  }

  protected openJson(): void {
    this.jsonError.set('');
    this.json.set(JSON.stringify(this.value(), null, 2));
  }

  protected applyJson(): void {
    try {
      const parsed = JSON.parse(this.json() ?? '');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Un objet JSON est attendu.');
      this.value.set(parsed as Condition);
      this.json.set(null);
      this.jsonError.set('');
    } catch (error) {
      this.jsonError.set(`JSON invalide : ${(error as Error).message}`);
    }
  }
}
