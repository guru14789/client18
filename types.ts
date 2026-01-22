export enum Language {
  ENGLISH = 'en',
  TAMIL = 'ta',
  HINDI = 'hi',
  MALAYALAM = 'ml',
  TELUGU = 'te',
  KANNADA = 'kn',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  CHINESE = 'zh',
  ARABIC = 'ar',
  PORTUGUESE = 'pt',
  BENGALI = 'bn',
  RUSSIAN = 'ru',
  JAPANESE = 'ja',
  ITALIAN = 'it'
}

export interface User {
  uid: string;
  phoneNumber: string;
  displayName: string;
  profilePhoto?: string;
  createdAt: string; // ISO String or Timestamp representation
  lastLoginAt: string; // ISO String
  defaultFamilyId?: string;
  familyIds: string[];
  draftCount: number;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notificationsEnabled: boolean;
  };
  preferredLanguage?: Language;
  archivedQuestionIds?: string[];
}

export interface Family {
  id: string;
  familyName: string;
  createdBy: string;
  createdAt: string;
  defaultLanguage: string;
  members: string[];
  admins: string[];
  inviteCode?: string; // Kept for logic
}

export interface Memory {
  id: string;
  authorId: string;
  authorName: string;
  familyIds: string[];
  status: 'draft' | 'published';
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  questionId?: string;
  questionText?: string;
  language?: Language;
  createdAt: string;
  publishedAt: string | null;
  sharedExternally?: boolean;
  views?: number;
  likes: string[];
  comments: Comment[];
}

export interface Question {
  id: string;
  familyId: string;
  askedBy: string;
  askedByName: string;
  directedTo?: string | null;
  type: 'text' | 'video';
  text: {
    english: string;
    translated: string;
  };
  videoUrl?: string | null;
  upvotes: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  phoneNumber: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
}

export interface SecureInvite {
  id: string;
  familyId: string;
  token: string;
  createdBy: string;
  expiresAt: string;
  usedBy?: string[];
  maxUses?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_memory' | 'question' | 'upvote';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  type: 'memory_published' | 'question_asked' | 'upvote';
  targetId: string;
  familyId: string;
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
  fileUrl: string;
  storagePath: string;
  uploaderId: string;
}

export interface JoinRequest {
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  familyName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type AppState = 'splash' | 'onboarding' | 'login' | 'home' | 'feed' | 'questions' | 'record' | 'drafts' | 'profile' | 'documents' | 'nameEntry' | 'ask_question';
