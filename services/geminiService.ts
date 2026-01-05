import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language } from "../types";

export const translateQuestion = async (text: string, targetLanguage: Language): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(`Translate the following memory-sharing question into ${targetLanguage}. Keep the tone warm and conversational for a family setting. Output ONLY the translated text.\n\nQuestion: "${text}"`);
    
    return response.response.text().trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

export const generateDocumentContext = async (filename: string, fileData?: string, mimeType?: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a warm, knowledgeable family historian. A user has uploaded a record named "${filename}". 
    ${fileData ? "Analyze the contents of this document." : "Based on the filename,"} 
    Write a warm, evocative 1-sentence description (max 20 words) explaining why this record is a treasure for future generations. 
    Focus on legacy, roots, and connection. Avoid generic phrases like "This document is".`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim() || "A precious thread in the family tapestry, carefully preserved.";
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "A tangible record of your family's journey, preserved for the generations to come.";
  }
};