import { STYLE_PROMPTS, AI_PROVIDERS } from "../constants";
import { GoogleGenAI, Type } from "@google/genai";
import { getAIService, checkApiKey as checkApiKeyService, getSelectedProvider } from "./aiService";

// 获取当前选择的模型
export const getSelectedModel = () => {
  if (typeof window !== 'undefined') {
    const savedModel = localStorage.getItem('ai_model');
    if (savedModel) {
      return savedModel;
    }
  }
  // 默认返回当前提供商的第一个模型
  const provider = getSelectedProvider();
  const providerConfig = AI_PROVIDERS.find(p => p.id === provider);
  if (providerConfig && providerConfig.models.length > 0) {
    return providerConfig.models[0].id;
  }
  return 'gemini-3-pro-image-preview'; // 兜底默认模型
};

// 获取模型配置
export const getModelConfig = (modelId: string) => {
  // 在所有提供商中查找模型
  for (const provider of AI_PROVIDERS) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      return model;
    }
  }
  // 默认返回第一个提供商的第一个模型
  return AI_PROVIDERS[0].models[0];
};

// 向后兼容的初始化函数
export const initGemini = () => {
  const service = getAIService();
  return service !== null;
};

// 向后兼容的检查函数
export const checkApiKey = checkApiKeyService;

export const openKeySelection = async () => {
    // 这个方法现在不再需要，因为设置通过SettingsModal处理
    // 保留是为了向后兼容
    return false;
}

export const generateStickerImage = async (
  character: string,
  emotion: string,
  style: keyof typeof STYLE_PROMPTS
): Promise<string> => {
  const service = getAIService();
  if (!service) {
    throw new Error("API Key not initialized. Please set your API key in settings.");
  }

  // Prompt optimized for client-side background removal
  const prompt = `design a single die-cut sticker of ${character} expressing "${emotion}". 
  Style: ${STYLE_PROMPTS[style]}. 
  The background must be solid pure white (#FFFFFF). 
  The character should have a subtle white border (die-cut effect).
  Centered composition, whole body or portrait visible.
  High contrast, vector-like clarity. 
  NO text, NO speech bubbles in the image. 
  Square aspect ratio.`;

  try {
    const modelId = getSelectedModel();
    const modelConfig = getModelConfig(modelId);
    
    return await service.generateImage(prompt, {
      imageModel: modelConfig.imageModel,
      textModel: modelConfig.textModel
    });
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const generatePackMetadata = async (
  character: string,
  phrases: string[]
): Promise<{ name: string; description: string }> => {
  const service = getAIService();
  if (!service) {
    throw new Error("API Key not initialized. Please set your API key in settings.");
  }

  const prompt = `Create WeChat sticker pack metadata for: "${character}".
  Emotions: ${phrases.join(', ')}.
  
  Required JSON format:
  1. name: Chinese, creative, MAX 5 characters.
  2. description: Chinese, engaging, MAX 80 characters.`;

  try {
    const modelId = getSelectedModel();
    const modelConfig = getModelConfig(modelId);
    
    const text = await service.generateText(prompt, {
      textModel: modelConfig.textModel,
      imageModel: modelConfig.imageModel
    });
    
    if (!text) throw new Error("No metadata generated");
    
    // 尝试解析 JSON（不同提供商可能返回格式不同）
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // 如果不是 JSON，尝试提取 JSON 部分
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON format");
      }
    }
    
    return {
      name: parsed.name || "专属表情",
      description: parsed.description || "由 AI 生成的个性化表情包。"
    };
  } catch (error) {
    console.error("Metadata Gen Error:", error);
    return {
      name: "专属表情",
      description: "由 AI 生成的个性化表情包。"
    };
  }
};