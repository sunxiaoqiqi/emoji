import { GoogleGenAI, Type } from "@google/genai";
import { AIService } from "../aiService";

export class GeminiService implements AIService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';

  init(apiKey: string): boolean {
    try {
      this.apiKey = apiKey;
      this.genAI = new GoogleGenAI({ apiKey });
      return true;
    } catch (error) {
      console.error('Gemini initialization failed:', error);
      return false;
    }
  }

  async checkApiKey(): Promise<boolean> {
    if (!this.genAI) {
      return false;
    }
    // 简单的验证：尝试调用一个轻量级的 API
    try {
      // 这里可以添加一个简单的验证调用
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateImage(prompt: string, config?: any): Promise<string> {
    if (!this.genAI) {
      throw new Error("Gemini service not initialized");
    }

    const imageModel = config?.imageModel || 'gemini-3-pro-image-preview';
    
    try {
      const response = await this.genAI.models.generateContent({
        model: imageModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data returned");
    } catch (error) {
      console.error("Gemini Image Gen Error:", error);
      throw error;
    }
  }

  async generateText(prompt: string, config?: any): Promise<string> {
    if (!this.genAI) {
      throw new Error("Gemini service not initialized");
    }

    const textModel = config?.textModel || 'gemini-2.5-flash';
    
    try {
      const response = await this.genAI.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: config?.schema || {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["name", "description"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No text generated");
      return text;
    } catch (error) {
      console.error("Gemini Text Gen Error:", error);
      throw error;
    }
  }
}

