
export enum Language {
  SPANISH = 'Spanish',
  HINDI = 'Hindi',
  FRENCH = 'French',
  GERMAN = 'German',
  CHINESE = 'Chinese',
  ARABIC = 'Arabic',
  PORTUGUESE = 'Portuguese',
  BENGALI = 'Bengali',
  RUSSIAN = 'Russian',
  JAPANESE = 'Japanese',
  ITALIAN = 'Italian',
  TAMIL = 'Tamil'
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  families: string[]; // Family IDs
  avatarUrl?: string;
  role?: 'admin' | 'user';
}

export interface Memory {
  id: string;
  askerId?: string;
  responderId: string;
  videoUrl: string;
  timestamp: string;
  familyId: string;
  isDraft: boolean;
  questionText?: string;
  questionTranslation?: string;
}

export interface Question {
  id: string;
  askerId: string;
  askerName: string;
  text: string;
  translation?: string;
  language: Language;
  upvotes: number;
  hasUpvoted?: boolean;
  directedTo?: string; // User ID
  isVideoQuestion: boolean;
  videoUrl?: string;
}

export interface Family {
  id: string;
  name: string;
  motherTongue: Language;
}

// Added missing FamilyDocument interface properties to resolve import errors and property access errors
export interface FamilyDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  timestamp: string;
  familyId: string;
  aiSummary?: string;
  fileUrl?: string;
  storagePath?: string;
  uploaderId?: string;
}

export type AppState = 'splash' | 'onboarding' | 'login' | 'nameEntry' | 'home' | 'feed' | 'questions' | 'record' | 'drafts' | 'documents' | 'profile';
