import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../admin-api.service';
import { adminT } from '../admin-i18n';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ t('account.title') }}</h1>
    @if (api.admin()?.must_change_password) {
      <p class="status is-error" role="alert">{{ t('account.temporary') }}</p>
    }
    <form class="form-section" (submit)="submit($event)" novalidate>
      <h2>{{ t('account.change_password') }}</h2>
      <div class="form-grid">
        <div class="field">
          <label for="pw-current">{{ t('account.current') }}</label>
          <input
            id="pw-current"
            class="text-input"
            type="password"
            autocomplete="current-password"
            (input)="current.set(value($event))"
          />
        </div>
        <div class="field">
          <label for="pw-new">{{ t('account.new') }}</label>
          <input
            id="pw-new"
            class="text-input"
            type="password"
            autocomplete="new-password"
            aria-describedby="pw-rule"
            (input)="next.set(value($event))"
          />
          <p id="pw-rule" class="hint">{{ t('account.rule') }}</p>
        </div>
        <div class="field">
          <label for="pw-confirm">{{ t('account.confirm') }}</label>
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
        <button type="submit" class="btn btn-primary">{{ t('common.save') }}</button>
      </div>
    </form>
  `,
})
export class AccountPage {
  protected readonly api = inject(AdminApi);
  protected readonly t = adminT();
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
      this.message.set(this.t('account.mismatch'));
      return;
    }
    try {
      await this.api.changePassword(this.current(), this.next());
      this.failed.set(false);
      this.message.set(this.t('account.changed'));
    } catch (error) {
      this.message.set((error as Error).message);
    }
  }
}
