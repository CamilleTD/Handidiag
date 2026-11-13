/** Types des données servies par l'API publique (voir backend/app/services.py). */

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

/** Question de la banque (textes et réponses possibles). */
export interface Question {
  key: string;
  kind: 'single' | 'multiple';
  text: LocalizedText;
  text_falc: LocalizedText | null;
  help: LocalizedText | null;
  options: QuestionOption[];
}

/** Question placée dans un questionnaire, avec ses réglages propres. */
export interface QuestionnaireQuestion extends Question {
  required: boolean;
  show_if: Condition | null;
  /** Réponse fixée d'office : la question n'est pas posée. */
  auto_answer: string | null;
}

export interface Section {
  title: LocalizedText;
  intro: LocalizedText | null;
  /** Section facultative, proposée après les autres. */
  optional: boolean;
  questions: QuestionnaireQuestion[];
}

export interface Outcome {
  key: string;
  /** null : résultat imposé uniquement par une règle. */
  min_score: number | null;
  icon: IconName;
  title: LocalizedText;
  body: LocalizedText;
  body_falc: LocalizedText | null;
  next: { key: string; title: LocalizedText } | null;
  contacts: string[];
}

export interface Rule {
  key: string;
  condition: Condition;
  points: number;
  /** Résultat imposé par la règle (la première déclenchée l'emporte). */
  override: string | null;
  explanation: LocalizedText | null;
  flags: string[];
  suggestions: string[];
  contacts: string[];
}

export interface Flag {
  key: string;
  text: LocalizedText;
  /** Met en avant les interlocuteurs tenus au secret médical. */
  highlight_confidential: boolean;
}

export interface TextItem {
  key: string;
  text: LocalizedText;
}

export type ContactGroup = 'school' | 'work' | 'other';

export interface Contact {
  key: string;
  icon: IconName;
  name: LocalizedText;
  role: LocalizedText;
  email: string | null;
  link_url: string | null;
  link_label: LocalizedText | null;
  is_confidential: boolean;
  group: ContactGroup | null;
}

/** Version publiée (ou brouillon en aperçu) d'un questionnaire, autonome. */
export interface QuestionnaireSnapshot {
  key: string;
  version?: number;
  title: LocalizedText;
  description: LocalizedText | null;
  sections: Section[];
  outcomes: Outcome[];
  rules: Rule[];
  flags: Flag[];
  suggestions: TextItem[];
  contacts: Contact[];
}

export interface QuestionnaireSummary {
  key: string;
  title: LocalizedText;
  description: LocalizedText | null;
  featured: boolean;
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

export interface Content {
  questionnaires: QuestionnaireSummary[];
  resources: Resource[];
  pages: { slug: string; title: LocalizedText }[];
  school_contacts: Contact[];
}
