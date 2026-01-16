import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language } from "../types";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export const translateQuestion = async (text: string, targetLanguage: Language): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("Gemini API key is missing. Skipping translation.");
    return text;
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `Translate this family memory question into ${targetLanguage}. Return ONLY the translation, no extra text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error("Gemini translation error:", err);
    return text;
  }
};

export const generateDocumentContext = async (filename: string, fileData?: string, mimeType?: string): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return "A precious family record, safely archived.";
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
  } catch (err) {
    console.error("Gemini context error:", err);
    return "A precious family record, safely archived.";
  }
};