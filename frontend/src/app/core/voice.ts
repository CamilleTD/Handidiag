/**
 * Lecture à voix haute plus naturelle (fonctions pures).
 *  - pickVoice : meilleure voix du navigateur, en restant sur une voix LOCALE si allowOnline est faux.
 *  - makeChunks : découpe en phrases courtes avec des pauses, comme un lecteur humain.
 */

export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
}

export interface SpeechPart<E = unknown> {
  text: string;
  element?: E | null;
  pause?: number;
}

const NATURAL = /natural|neural|premium|enhanced|am[ée]lior|siri|wavenet|studio|online/i;
const ROBOTIC = /compact|espeak|robot|festival|mbrola|novelty/i;

const norm = (tag: string) =>
  String(tag || '')
    .toLowerCase()
    .replace('_', '-');
const sameLanguage = (voice: VoiceLike, lang: string) =>
  norm(voice.lang).startsWith(norm(lang).slice(0, 2));

export function score(voice: VoiceLike, lang: string): number {
  const name = voice.name || '';
  let s = 0;
  if (norm(voice.lang) === (lang === 'fr' ? 'fr-fr' : lang === 'en' ? 'en-gb' : norm(lang)))
    s += 10;
  if (NATURAL.test(name)) s += 40;
  if (/google/i.test(name)) s += 25;
  if (/microsoft/i.test(name)) s += 15;
  if (ROBOTIC.test(name)) s -= 40;
  if (voice.localService !== false) s += 5;
  if (voice.default) s += 2;
  return s;
}

export function pickVoice<V extends VoiceLike>(
  voices: V[],
  lang: string,
  options: { preferred?: string; allowOnline?: boolean } = {},
): V | null {
  let pool = voices.filter((v) => sameLanguage(v, lang));
  if (options.preferred) {
    const chosen = pool.find((v) => v.voiceURI === options.preferred);
    if (chosen) return chosen;
  }
  if (!options.allowOnline) pool = pool.filter((v) => v.localService !== false);
  return [...pool].sort((a, b) => score(b, lang) - score(a, lang))[0] ?? null;
}

export function splitSentences(text: string): string[] {
  const parts =
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?…]+[.!?…]*/g) ?? [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function makeChunks<E>(parts: SpeechPart<E>[]): Required<SpeechPart<E>>[] {
  return parts.flatMap((part) => {
    const sentences = splitSentences(part.text);
    return sentences.map((text, i) => ({
      text,
      element: part.element ?? null,
      pause: i === sentences.length - 1 ? (part.pause ?? 350) : 160,
    }));
  });
}
