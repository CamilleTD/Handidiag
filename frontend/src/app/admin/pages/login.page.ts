import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApi } from '../admin-api.service';
import { adminT } from '../admin-i18n';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      <h1>{{ t('login.title') }}</h1>
      <p class="lead">{{ t('login.lead') }}</p>
      <ul class="chips" [attr.aria-label]="t('login.chips_label')">
        <li>{{ t('login.chip1') }}</li>
        <li>{{ t('login.chip2') }}</li>
        <li>{{ t('login.chip3') }}</li>
      </ul>
      <form class="panel login-card" (submit)="submit($event)" novalidate>
        <h2>{{ t('login.form_title') }}</h2>
        <div class="field">
          <label for="adm-user">{{ t('login.username') }}</label>
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
          <label for="adm-pass">{{ t('login.password') }}</label>
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
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            {{ t('login.submit') }}
          </button>
        </div>
      </form>
      <p class="hint">
        {{ t('login.no_account') }}
        <code>python -m app.cli create-admin &lt;{{ t('login.username') }}&gt;</code>
      </p>
    </div>
  `,
})
export class LoginPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
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
      this.error.set(this.t('login.fill'));
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
