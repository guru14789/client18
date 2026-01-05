# Inai - Family Heritage Vault

## Overview

Inai is a family heritage preservation application that enables users to capture, share, and preserve family memories through video recordings and secure document sharing. The app connects generations by allowing family members to ask questions, record video responses, and maintain a shared family archive. Key features include multi-language support with AI-powered translation, family group management, and document storage with AI-generated contextual descriptions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript, using functional components and hooks
- **State Management**: Local React state with useState/useEffect; no external state library
- **Styling**: Tailwind CSS loaded via CDN with custom theme configuration (primary ocean blue, warm accent colors)
- **Build Tool**: Vite for development and production builds
- **Routing**: Single-page app with view state managed in App.tsx (splash → onboarding → login → main views)

### View Structure
The app uses a state-based navigation pattern with these main views:
- SplashScreen → Onboarding → Login → Dashboard/Feed/Questions/RecordMemory/Drafts/Documents/Profile

### Backend Services
- **Database**: Firebase Firestore for document/memory storage and real-time subscriptions
- **File Storage**: Firebase Storage for video recordings and PDF documents
- **Authentication**: Phone number-based login flow (OTP simulation, not Firebase Auth)
- **Analytics**: Firebase Analytics and Google Analytics (gtag.js)

### AI Integration
- **Gemini API**: Used for two features:
  1. Question translation between languages (gemini-1.5-flash model)
  2. Document context generation - creates warm, descriptive summaries for uploaded family documents

### Data Models
Key entities defined in types.ts:
- **User**: Phone-based identity with family associations
- **Family**: Group with name and mother tongue language setting
- **Memory**: Video recordings linked to questions and families
- **Question**: Prompts for family members with upvotes and translations
- **FamilyDocument**: Uploaded PDFs with AI-generated descriptions

### Media Handling
- Video recording using MediaRecorder API with WebM/VP8/VP9 codec support
- Camera switching (front/back) support for mobile devices
- PDF document uploads with base64 encoding for AI analysis

## External Dependencies

### Firebase Services
- **Firestore**: Document database for memories, questions, and family documents
- **Storage**: File storage for video recordings and PDF uploads
- **Analytics**: User behavior tracking
- Environment variables required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID

### Google Gemini AI
- Model: gemini-1.5-flash for text generation
- Environment variable: GEMINI_API_KEY
- Used for translation and document summarization

### CDN Dependencies
- Tailwind CSS loaded from cdn.tailwindcss.com
- Google Fonts (Inter)
- Google Analytics (gtag.js)

### Deployment
- Configured for Vercel with SPA rewrites (vercel.json)
- Vite dev server runs on port 5000