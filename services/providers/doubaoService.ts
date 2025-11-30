import { AIService } from "../aiService";

export class DoubaoService implements AIService {
  private apiKey: string = '';
  private baseUrl: string = 'https://ark.cn-beijing.volces.com/api/v3';

  init(apiKey: string): boolean {
    this.apiKey = apiKey;
    return true;
  }

  async checkApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    // 验证 API Key：尝试调用一个轻量级的 API
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'ep-20241220101210-xxxxx', // 需要替换为实际的模型 ID
          messages: [
            {
              role: 'user',
              content: 'test'
            }
          ],
          max_tokens: 1
        })
      });
      return response.ok || response.status === 400; // 400 也可能表示 API Key 有效但参数错误
    } catch (error) {
      return false;
    }
  }

  async generateImage(prompt: string, config?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Doubao service not initialized");
    }

    // 豆包的图像生成 API（需要根据实际 API 文档调整）
    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config?.imageModel || 'doubao-image-v1',
          prompt: prompt,
          size: '1024x1024',
          n: 1,
          response_format: 'url'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Image generation failed');
      }

      const data = await response.json();
      
      // 豆包返回的是图片 URL，需要转换为 base64
      if (data.data && data.data.length > 0) {
        const imageUrl = data.data[0].url;
        // 将图片 URL 转换为 base64
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      throw new Error("No image data returned");
    } catch (error) {
      console.error("Doubao Image Gen Error:", error);
      throw error;
    }
  }

  async generateText(prompt: string, config?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Doubao service not initialized");
    }

    const model = config?.textModel || 'ep-20241220101210-xxxxx'; // 需要替换为实际的模型 ID
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Text generation failed');
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error("No text generated");
    } catch (error) {
      console.error("Doubao Text Gen Error:", error);
      throw error;
    }
  }
}

