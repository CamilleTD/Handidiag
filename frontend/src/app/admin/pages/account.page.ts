import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../admin-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Mon compte</h1>
    @if (api.admin()?.must_change_password) {
      <p class="status is-error" role="alert">
        Ce compte utilise un mot de passe provisoire : choisissez-en un nouveau pour continuer.
      </p>
    }
    <form class="form-section" (submit)="submit($event)" novalidate>
      <h2>Changer le mot de passe</h2>
      <div class="form-grid">
        <div class="field">
          <label for="pw-current">Mot de passe actuel</label>
          <input
            id="pw-current"
            class="text-input"
            type="password"
            autocomplete="current-password"
            (input)="current.set(value($event))"
          />
        </div>
        <div class="field">
          <label for="pw-new">Nouveau mot de passe</label>
          <input
            id="pw-new"
            class="text-input"
            type="password"
            autocomplete="new-password"
            aria-describedby="pw-rule"
            (input)="next.set(value($event))"
          />
          <p id="pw-rule" class="hint">Au moins 12 caractères, avec des lettres et des chiffres.</p>
        </div>
        <div class="field">
          <label for="pw-confirm">Confirmer le nouveau mot de passe</label>
          <input
            id="pw-confirm"
            class="text-input"
            type="password"
            autocomplete="new-password"
            (input)="confirm.set(value($event))"
          />
        </div>
      </div>
      @if (message()) {
        <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
      }
      <div class="actions">
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </div>
    </form>
  `,
})
export class AccountPage {
  protected readonly api = inject(AdminApi);
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.failed.set(true);
    if (this.next() !== this.confirm()) {
      this.message.set('Les deux nouveaux mots de passe ne sont pas identiques.');
      return;
    }
    try {
      await this.api.changePassword(this.current(), this.next());
      this.failed.set(false);
      this.message.set('Mot de passe modifié. Les autres sessions de ce compte ont été fermées.');
    } catch (error) {
      this.message.set((error as Error).message);
    }
  }
}
