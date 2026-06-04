export interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  tagline: string;
  xpValue: number;
  levels: Array<{
    id: string;
    level: string; // "Beginner", "Intermediate", "Advanced"
    description: string;
  }>;
  commonPhrases: Array<{
    phrase: string;
    translation: string;
    pronunciation: string;
    category: string;
  }>;
  topics: string[];
}

export interface VocabularyWord {
  id: string;
  word: string;
  phrasingGuide?: string; // Romaji, Pinyin, phonetic etc.
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  notes?: string;
}

export type QuizType = "multiple-choice" | "fill-blank" | "unscramble" | "translation" | "listening-text";

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: string[]; // and scrambled words as elements
  correctAnswer: string;
  explanation: string;
  contextHint?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  translation?: string; // translation of the AI response
  corrections?: {
    originalText: string;
    correctedText: string;
    explanation: string; // what the mistake was and how to improve
  };
  timestamp: string;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  description: string;
  locationSymbol: string; // Lucide icon name or emoji
  difficulty: "Easy" | "Medium" | "Hard";
  initialPrompt: string; // System instruction for AI character
  scenarioGoal: string;
}

export interface SentenceAnalysisPart {
  original: string;
  meaning: string;
  partOfSpeech: string;
  grammarDetails?: string;
}

export interface SentenceAnalysis {
  originalSentence: string;
  overallTranslation: string;
  grammarComplexity: string; // e.g. "Basic structure", "Polite conjugation"
  breakdown: SentenceAnalysisPart[];
  alternatives: Array<{
    sentence: string;
    meaning: string;
  }>;
}

export interface UserProgress {
  selectedLanguageId: string;
  currentLevel: string; // Beginner, Intermediate, Advanced
  streak: number;
  totalXP: number;
  lastActiveDate: string; // ISO date string
  masteredWordsCount: number;
}
