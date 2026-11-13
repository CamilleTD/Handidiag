import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApi } from '../admin-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      <h1>Espace administrateur</h1>
      <p class="lead">
        Modifiez le questionnaire, les règles et la restitution, et consultez les statistiques
        anonymes.
      </p>
      <ul class="chips" aria-label="Ce que contient cet espace">
        <li>Aucune réponse individuelle</li>
        <li>Compteurs anonymes uniquement</li>
        <li>Petits effectifs masqués</li>
      </ul>
      <form class="panel login-card" (submit)="submit($event)" novalidate>
        <h2>Connexion</h2>
        <div class="field">
          <label for="adm-user">Identifiant</label>
          <input
            id="adm-user"
            class="text-input"
            name="username"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            [value]="username()"
            (input)="username.set(value($event))"
          />
        </div>
        <div class="field">
          <label for="adm-pass">Mot de passe</label>
          <input
            id="adm-pass"
            class="text-input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            (input)="password.set(value($event))"
          />
        </div>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <div class="actions">
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Se connecter</button>
        </div>
      </form>
      <p class="hint">
        Pas de compte ? Un administrateur peut en créer un avec
        <code>python -m app.cli create-admin &lt;identifiant&gt;</code>.
      </p>
    </div>
  `,
})
export class LoginPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.username().trim() || !this.password()) {
      this.error.set('Renseignez l’identifiant et le mot de passe.');
      return;
    }
    this.busy.set(true);
    try {
      const admin = await this.api.login(this.username().trim(), this.password());
      void this.router.navigateByUrl(admin.must_change_password ? '/admin/account' : '/admin');
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
