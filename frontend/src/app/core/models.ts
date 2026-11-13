/** Types du contenu servi par GET /api/content (voir backend/app/services.py). */

export type Lang = 'fr' | 'en';

/** Texte bilingue : le français est obligatoire, l'anglais retombe sur le français. */
export interface LocalizedText {
  fr: string;
  en: string;
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { q: string; in: string[] }
  | { q: string; hasAny: string[] }
  | { q: string; countAtLeast: number; among?: string[] }
  | { q: string; answered: boolean };

export type IconName =
  'book' | 'chat' | 'clock' | 'badge' | 'user' | 'building' | 'shield' | 'doc' | 'compass';

export interface QuestionOption {
  key: string;
  exclusive: boolean;
  label: LocalizedText;
}

export interface Question {
  key: string;
  kind: 'single' | 'multiple';
  phase: 'core' | 'deep';
  step: string | null;
  required: boolean;
  hidden: boolean;
  auto_answer: string | null;
  show_if: Condition | null;
  stop_if: Condition | null;
  tracks: string[];
  text: LocalizedText;
  text_falc: LocalizedText | null;
  help: LocalizedText | null;
  options: QuestionOption[];
}

export interface Level {
  key: string;
  min_score: number | null;
  icon: IconName;
  title: LocalizedText;
  body: LocalizedText;
  body_falc: LocalizedText | null;
}

export type PoleOutcomeKey = 'followed' | 'suggest' | 'maybe' | 'none' | 'declined';

export interface Rule {
  key: string;
  condition: Condition;
  points: number;
  override_level: string | null;
  pole_outcome: 'suggest' | 'maybe' | null;
  explanation: LocalizedText | null;
  flags: string[];
  suggestions: string[];
}

export interface TextItem {
  key: string;
  text: LocalizedText;
}

export interface Contact {
  key: string;
  icon: IconName;
  name: LocalizedText;
  role: LocalizedText;
  email: string | null;
  link_url: string | null;
  link_label: LocalizedText | null;
  is_confidential: boolean;
  pole_group: 'school' | 'work' | null;
}

export interface Content {
  questions: Question[];
  levels: Level[];
  rules: Rule[];
  flags: TextItem[];
  suggestions: TextItem[];
  pole_outcomes: Partial<Record<PoleOutcomeKey, { title: LocalizedText; body: LocalizedText }>>;
  contacts: Contact[];
  profile_contacts: Record<string, string[]>;
  resources: Resource[];
  pages: { slug: string; title: LocalizedText }[];
}

export type ResourceSection = 'official' | 'public' | 'association' | 'law';

/** Lien du kit (official) ou de la page Ressources (public, association, law). */
export interface Resource {
  section: ResourceSection;
  key: string;
  url: string | null;
  title: LocalizedText;
  description: LocalizedText;
  reference: LocalizedText | null;
}

export type PageBlock =
  | { type: 'text' | 'accordion'; title: LocalizedText; text: LocalizedText }
  | { type: 'link' | 'document'; title: LocalizedText; text: LocalizedText | null; url: string };

/** Page « S'informer ». */
export interface ContentPage {
  slug: string;
  title: LocalizedText;
  intro: LocalizedText | null;
  blocks: PageBlock[];
}
