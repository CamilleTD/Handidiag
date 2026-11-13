import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import type { Condition, Question } from '../../../core/models';
import { adminT, adminText } from '../../admin-i18n';
import { describe, emptyLeaf } from '../../conditions';
import { ConditionEditorComponent } from '../condition-editor/condition-editor.component';

let nextId = 0;

/**
 * Bloc « condition » d'un formulaire : résumé lisible, éditeur visuel et, pour les cas
 * complexes, édition directe du JSON (validée par le serveur à l'enregistrement).
 */
@Component({
  selector: 'app-condition-field',
  imports: [ConditionEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condition-field.component.html',
  styleUrl: './condition-field.component.scss',
})
export class ConditionFieldComponent {
  readonly value = model<Condition | null>(null);
  readonly questions = input.required<Question[]>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly optional = input(false);
  readonly optionalLabel = input('');
  protected readonly t = adminT();
  private readonly localized = adminText();
  protected readonly id = `cf-${nextId++}`;
  protected readonly json = signal<string | null>(null);
  protected readonly jsonError = signal('');
  protected readonly summary = computed(() =>
    describe(this.value(), this.questions(), this.t, this.localized),
  );

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
        throw new Error(this.t('cond.json_object'));
      this.value.set(parsed as Condition);
      this.json.set(null);
      this.jsonError.set('');
    } catch (error) {
      this.jsonError.set(this.t('cond.json_invalid', { error: (error as Error).message }));
    }
  }
}
