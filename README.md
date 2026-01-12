<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Inai Family Connect 🔥

A production-ready family heritage preservation app with video memories, document vault, and multi-language support.

**Firebase Integration:** ✅ **COMPLETE**

---

## 🔥 Firebase Services Integrated

- ✅ **Authentication** (Phone + Google)
- ✅ **Firestore Database** (Real-time synchronization)
- ✅ **Storage** (Videos & Documents)
- ✅ **Cloud Messaging** (Push Notifications)
- ✅ **Analytics** (User insights)
- ✅ **Translation** (13 languages via i18n)

---

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env.local` file based on `.env.template` and fill in your Firebase credentials.
```bash
cp .env.template .env.local
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 📦 Project Structure

```
services/
├── firebaseConfig.ts          # Central Firebase initialization
├── firebaseAuth.ts            # Auth utility functions
├── firebaseDatabase.ts        # Firestore CRUD & Listeners
├── firebaseStorage.ts         # File upload & management
├── firebaseMessaging.ts       # Push notification handling
├── firebaseServices.ts        # Unified service export layer
├── geminiService.ts           # AI (Gemini) integration
└── i18n.ts                    # Internationalization (13 languages)

components/
├── Login.tsx                  # Secure Multi-factor Auth
├── Dashboard.tsx              # Personalized Home View
├── Feed.tsx                   # Family Memory Stream
├── Questions.tsx              # Heritage Q&A Bank
├── Documents.tsx              # Secure Document Vault
└── Profile.tsx                # User Settings & Localization
```

---

## ✨ Core Features

- 📱 **Secure Auth:** Phone & Google authentication via Firebase Auth.
- 🎥 **Video Memories:** Record and share family stories in real-time.
- 📄 **Vault:** AI-summarized document storage for family records.
- 💬 **Q&A:** Collaborative family question-and-answer platform.
- 🔔 **Intelligent Notifs:** Push notifications for family activity.
- 🌍 **Native Support:** Fully localized in 13 languages.

---

## 🌍 Supported Languages

English • Spanish • Hindi • Tamil • French • German • Chinese • Arabic • Portuguese • Bengali • Russian • Japanese • Italian

---

## 🔐 Security & Production

- **No Hardcoded Keys:** All configurations are loaded via environment variables.
- **Service Workers:** FCM background handling integrated in `public/firebase-messaging-sw.js`.
- **Type Safety:** Full TypeScript implementation across all services and components.
- **Clean Code:** Standardized service layer to prevent redundant logic.

---

View your app in AI Studio: https://ai.studio/apps/drive/1v4steBnp14LaougiyCuLiltBm7DLvWT9
