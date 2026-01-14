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
  TAMIL = 'Tamil',
  ENGLISH = 'English'
}

export interface User {
  uid: string;
  name: string;
  phoneNumber: string;
  createdAt: string; // ISO String
  lastLoginAt: string; // ISO String
  profilePhoto?: string;
  draftCount?: number;
  families: string[]; // Family IDs
  activeFamilyId?: string;
  preferredLanguage?: Language;
  theme?: 'light' | 'dark' | 'system';
}

export interface Family {
  id: string;
  familyName: string;
  createdBy: string; // User UID
  members: string[]; // User UIDs
  defaultLanguage: Language;
  createdAt: string;
  inviteCode: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Memory {
  id: string;
  familyIds: string[]; // Published to these families
  authorId: string;
  videoUrl: string; // Firebase Storage URL
  thumbnailUrl?: string; // Firebase Storage URL
  duration?: number;
  status: 'draft' | 'published';
  questionId?: string; // Linked question if any
  questionText?: string; // Cached for feed
  language?: Language; // Cached for feed
  createdAt: string;
  publishedAt?: string;
  likes?: string[]; // User UIDs
  comments?: Comment[];
}

export interface Question {
  id: string;
  familyId: string;
  askedBy: string; // User UID
  askedByName: string; // Cached for performance
  directedTo?: string; // User UID
  type: 'text' | 'video';
  textEnglish?: string;
  textTranslated?: string;
  videoUrl?: string;
  upvotes: string[]; // Array of User UIDs
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_memory' | 'new_question' | 'upvote' | 'comment';
  message: string;
  relatedId?: string; // ID of the memory/question/etc
  read: boolean;
  createdAt: string;
}

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
