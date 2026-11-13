import { Injectable, inject, signal } from '@angular/core';
import { I18nService } from './i18n.service';
import { PreferencesService } from './preferences.service';
import { SpeechPart, makeChunks, pickVoice } from './voice';

export type ReadPart = SpeechPart<Element>;

/** Lecture à voix haute avec surlignage du passage lu. */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly prefs = inject(PreferencesService);
  private readonly i18n = inject(I18nService);
  /** Identifiant du bouton qui a lancé la lecture en cours. */
  readonly active = signal<string | null>(null);
  readonly voices = signal<SpeechSynthesisVoice[]>([]);
  readonly available =
    'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private marked: Element | null = null;

  constructor() {
    if (!this.available) return;
    const refresh = () => this.voices.set(speechSynthesis.getVoices());
    refresh();
    speechSynthesis.addEventListener('voiceschanged', refresh);
    window.addEventListener('pagehide', () => this.stop());
  }

  /** Lance la lecture, ou l'arrête si ce même bouton lisait déjà. */
  toggle(id: string, parts: ReadPart[], allowOnline = true): void {
    if (!this.available) return;
    const wasActive = this.active() === id;
    this.stop();
    if (wasActive) return;
    this.active.set(id);
    const chunks = makeChunks(parts);
    const next = (index: number) => {
      if (this.active() !== id) return;
      if (index >= chunks.length) return this.stop();
      const chunk = chunks[index];
      this.mark(chunk.element);
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const { lang, voice, rate } = this.prefs.value();
      utterance.lang = this.i18n.t('meta.speech');
      const chosen = pickVoice(speechSynthesis.getVoices(), lang, {
        preferred: voice,
        allowOnline: allowOnline || !!voice,
      });
      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang;
      }
      utterance.rate = rate;
      utterance.onend = () => (this.timer = setTimeout(() => next(index + 1), chunk.pause));
      utterance.onerror = () => this.active() === id && this.stop();
      speechSynthesis.speak(utterance);
    };
    next(0);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.active.set(null);
    this.mark(null);
    if (this.available) speechSynthesis.cancel();
  }

  private mark(element: Element | null): void {
    this.marked?.classList.remove('is-reading');
    this.marked = element;
    if (!element) return;
    element.classList.add('is-reading');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
}
