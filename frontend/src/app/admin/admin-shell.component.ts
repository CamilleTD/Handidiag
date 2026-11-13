import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminApi } from './admin-api.service';

/** Mise en page de l'administration : menu latéral fixe et zone de travail. */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Styles de l'administration, chargés seulement avec elle
  encapsulation: ViewEncapsulation.None,
  styleUrl: './admin.scss',
  template: `
    <div class="admin-layout">
      <nav class="admin-side" aria-label="Administration">
        <p class="admin-user">
          Connecté : <strong>{{ api.admin()?.username }}</strong>
        </p>
        <ul>
          @for (link of links; track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: link.path === '/admin' }"
              >
                {{ link.label }}
              </a>
            </li>
          }
        </ul>
        <button type="button" class="btn btn-small btn-quiet" (click)="logout()">
          Se déconnecter
        </button>
      </nav>
      <div class="admin-content">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminShell {
  protected readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly links = [
    { path: '/admin', label: 'Tableau de bord' },
    { path: '/admin/questions', label: 'Questions' },
    { path: '/admin/rules', label: 'Règles' },
    { path: '/admin/restitution', label: 'Restitution' },
    { path: '/admin/account', label: 'Mon compte' },
  ];

  protected async logout(): Promise<void> {
    await this.api.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
