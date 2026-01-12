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
  id: string;
  name: string;
  phoneNumber: string;
  families: string[]; // Family IDs
  activeFamilyId?: string;
  avatarUrl?: string;
  role?: 'admin' | 'user';
  preferredLanguage?: Language;
}

export interface GroupMembership {
  userId: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  joinedAt: string;
}

export interface Family {
  id: string;
  name: string;
  motherTongue: Language;
  admins: string[]; // User IDs
  members: string[]; // User IDs
  inviteCode: string;
  isApproved: boolean; // Platform approval
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
  askerId?: string;
  responderId: string;
  videoUrl: string;
  timestamp: string;
  familyId: string;
  isDraft: boolean;
  questionId?: string;
  questionText?: string;
  questionTranslation?: string;
  shareOption?: 'app_whatsapp' | 'app_only' | 'draft';
  language?: Language;
  likes?: string[]; // Array of user IDs
  comments?: Comment[];
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
  familyId: string; // Scoped to family
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
