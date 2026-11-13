import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Icônes SVG en ligne (aucun fichier à charger), décoratives : masquées aux lecteurs d'écran. */
const ICONS: Record<string, string> = {
  compass:
    '<circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="M5 5l14 14"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0A2 2 0 0 0 6 21h14"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  badge:
    '<path d="M12 2l2.4 1.9 3-.2 1 2.9 2.6 1.6-.9 2.9.9 2.9-2.6 1.6-1 2.9-3-.2L12 22l-2.4-1.9-3 .2-1-2.9L3 15.8l.9-2.9L3 10l2.6-1.6 1-2.9 3 .2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4h4v4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  doc: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  print: '<path d="M6 9V3h12v6M6 17H4v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6h-2M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
  speaker: '<path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 5c0 10-5 15-14 15"/><path d="M5 19l8-8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    class="ico"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    [innerHTML]="path()"
  ></svg>`,
  styles: ':host { display: contents; }',
})
export class IconComponent {
  readonly name = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  // Tracés constants définis ci-dessus : aucune donnée extérieure n'est injectée
  protected readonly path = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''),
  );
}

/** Pastille ronde contenant une icône. */
@Component({
  selector: 'app-medal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="medal"><app-icon [name]="name()" /></span>`,
  styles: ':host { display: contents; }',
})
export class MedalComponent {
  readonly name = input.required<string>();
}
