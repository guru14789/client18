import { GoogleGenerativeAI } from "@google/generative-ai";
import { Language } from "../types";

export const translateQuestion = async (text: string, targetLanguage: Language): Promise<string> => {
  return text;
};

export const generateDocumentContext = async (filename: string, fileData?: string, mimeType?: string): Promise<string> => {
  return "A tangible record of your family's journey, preserved for the generations to come.";
};