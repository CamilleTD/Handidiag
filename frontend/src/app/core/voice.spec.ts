import { describe, expect, it } from 'vitest';
import { makeChunks, pickVoice, splitSentences } from './voice';

const voice = (name: string, lang: string, localService = true) => ({
  name,
  lang,
  voiceURI: name,
  localService,
  default: false,
});

describe('voix', () => {
  const voices = [
    voice('eSpeak French', 'fr-FR'),
    voice('Microsoft Denise Online (Natural)', 'fr-FR', false),
    voice('Microsoft Hortense', 'fr-FR'),
    voice('Google UK English', 'en-GB', false),
  ];

  it('préfère une voix locale de qualité quand les voix en ligne sont exclues', () => {
    expect(pickVoice(voices, 'fr')?.name).toBe('Microsoft Hortense');
  });

  it('accepte une voix naturelle en ligne si elle est autorisée', () => {
    expect(pickVoice(voices, 'fr', { allowOnline: true })?.name).toContain('Natural');
  });

  it('respecte la voix choisie par la personne', () => {
    expect(pickVoice(voices, 'fr', { preferred: 'eSpeak French' })?.name).toBe('eSpeak French');
  });

  it('découpe en phrases avec une pause courte entre elles', () => {
    expect(splitSentences('Bonjour.  Ça va ? Oui !')).toEqual(['Bonjour.', 'Ça va ?', 'Oui !']);
    const chunks = makeChunks([{ text: 'Un. Deux.', pause: 500 }]);
    expect(chunks.map((c) => c.pause)).toEqual([160, 500]);
  });
});
