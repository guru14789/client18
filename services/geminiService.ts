import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language } from "../types";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

import { getConfigValue } from "./firebaseRemoteConfig";

export const translateQuestion = async (text: string, targetLanguage: Language): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    // console.warn("Gemini API key is missing. Skipping translation."); // Reduce noise
    return text;
  }

  // Check Remote Config
  const isEnabled = getConfigValue("enable_translation");
  if (!isEnabled) {
    return text;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Translate this family memory question into ${targetLanguage}. Return ONLY the translation, no extra text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err: any) {
    // Silent failure as requested.
    // The browser may still show a network 404, but we won't log anything to console.
    return text;
  }
};

export const generateDocumentContext = async (filename: string, fileData?: string, mimeType?: string): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return "A precious family record, safely archived.";
  }

  // Check Remote Config
  const isEnabled = getConfigValue("enable_translation"); // Assuming same flag controls AI features, or use "enable_ai_context"
  if (!isEnabled) {
    return "A precious family record, safely archived.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `Provide a very brief (1-2 sentences), warm, and nostalgic summary for a document named "${filename}" that has been uploaded to a family digital vault. The summary should feel like a family heritage preservation comment.`;

    if (fileData && mimeType) {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        }
      ]);
      const response = await result.response;
      return response.text().trim();
    } else {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    }
  } catch (err: any) {
    // Silent failure
    return "A precious family record, safely archived.";
  }
};