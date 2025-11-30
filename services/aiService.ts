// AI 服务抽象接口和统一入口

// 静态导入所有服务（避免浏览器环境问题）
import { GeminiService } from './providers/geminiService';
import { QwenService } from './providers/qwenService';
import { DoubaoService } from './providers/doubaoService';

export interface AIImageModel {
  id: string;
  name: string;
  description: string;
  provider: 'gemini' | 'qwen' | 'doubao';
  imageModel: string;
  textModel: string;
}

export interface AIService {
  // 初始化服务
  init(apiKey: string): boolean;
  
  // 检查 API Key 是否有效
  checkApiKey(): Promise<boolean>;
  
  // 生成图片
  generateImage(prompt: string, config?: any): Promise<string>;
  
  // 生成文本（用于元数据生成）
  generateText(prompt: string, config?: any): Promise<string>;
}

// AI 提供商类型
export type AIProvider = 'gemini' | 'qwen' | 'doubao';

// 获取当前选择的提供商
export const getSelectedProvider = (): AIProvider => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ai_provider');
    if (saved && ['gemini', 'qwen', 'doubao'].includes(saved)) {
      return saved as AIProvider;
    }
  }
  return 'gemini'; // 默认使用 Gemini
};

// 获取当前选择的 API Key
export const getApiKey = (provider: AIProvider): string | null => {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem(`${provider}_api_key`);
    return key;
  }
  return null;
};

// 保存 API Key
export const saveApiKey = (provider: AIProvider, apiKey: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${provider}_api_key`, apiKey);
    localStorage.setItem('ai_provider', provider);
  }
};

// AI 服务工厂
let currentService: AIService | null = null;
let currentProvider: AIProvider | null = null;
let currentApiKey: string | null = null;

export const getAIService = (): AIService | null => {
  const provider = getSelectedProvider();
  const apiKey = getApiKey(provider);
  
  // 如果提供商、API Key 或服务未变化，返回缓存的服务
  if (currentService && currentProvider === provider && currentApiKey === apiKey && apiKey) {
    return currentService;
  }
  
  // 如果没有 API Key，清除服务
  if (!apiKey) {
    currentService = null;
    currentProvider = null;
    currentApiKey = null;
    return null;
  }
  
  // 创建对应的服务实例
  currentProvider = provider;
  currentApiKey = apiKey;
  
  try {
    if (provider === 'gemini') {
      currentService = new GeminiService();
      currentService.init(apiKey);
    } else if (provider === 'qwen') {
      currentService = new QwenService();
      currentService.init(apiKey);
    } else if (provider === 'doubao') {
      currentService = new DoubaoService();
      currentService.init(apiKey);
    }
  } catch (error) {
    console.error('Failed to create AI service:', error);
    return null;
  }
  
  return currentService;
};

// 检查 API Key 是否已设置
export const checkApiKey = async (): Promise<boolean> => {
  const provider = getSelectedProvider();
  const apiKey = getApiKey(provider);
  
  if (!apiKey) {
    return false;
  }
  
  const service = getAIService();
  if (!service) {
    return false;
  }
  
  try {
    return await service.checkApiKey();
  } catch (error) {
    console.error('API Key check failed:', error);
    return false;
  }
};
