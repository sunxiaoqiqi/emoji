import { AIService } from "../aiService";

export class QwenService implements AIService {
  private apiKey: string = '';
  // 通义千问 API 基础 URL 配置
  // dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
  private baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1';

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
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'user',
                content: 'test'
              }
            ]
          },
          parameters: {
            max_tokens: 1
          }
        })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateImage(prompt: string, config?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Qwen service not initialized");
    }

    const model = config?.imageModel || 'wan2.5-i2v-preview';
    
    try {
      // 通义千问的图像生成 API
      const response = await fetch(`${this.baseUrl}/services/aigc/text-to-image/image-synthesis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            prompt: prompt
          },
          parameters: {
            size: '1024*1024', // 正方形
            n: 1,
            style: '<auto>'
          }
        })
      });

      if (!response.ok) {
        let errorMessage = 'Image generation failed';
        try {
          const error = await response.json();
          // 通义千问的错误格式可能是 error.message, error.code, 或 error.request_id
          errorMessage = error.message || 
                        error.error?.message || 
                        error.error?.code || 
                        error.code ||
                        error.request_id ||
                        `HTTP ${response.status}: ${response.statusText}`;
          console.error('Qwen API Error Response:', error);
          console.error('Qwen API Error Status:', response.status, response.statusText);
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Qwen API Response:', data);
      
      // 检查是否有错误
      if (data.code && data.code !== 'Success') {
        throw new Error(data.message || `API Error: ${data.code}`);
      }
      
      // 通义千问返回的是图片 URL，需要转换为 base64
      if (data.output && data.output.results && data.output.results.length > 0) {
        const imageUrl = data.output.results[0].url;
        if (!imageUrl) {
          throw new Error("图片 URL 为空");
        }
        // 将图片 URL 转换为 base64
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`无法下载图片: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        const blob = await imageResponse.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64);
          };
          reader.onerror = (e) => {
            reject(new Error('图片转换失败'));
          };
          reader.readAsDataURL(blob);
        });
      }
      
      throw new Error("No image data returned: " + JSON.stringify(data));
    } catch (error: any) {
      console.error("Qwen Image Gen Error:", error);
      // 处理 "Failed to fetch" 错误（通常是 CORS 或网络问题）
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        throw new Error('网络请求失败：可能是 CORS 限制或网络连接问题。通义千问 API 可能需要通过服务器端代理调用。');
      }
      throw error;
    }
  }

  async generateText(prompt: string, config?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Qwen service not initialized");
    }

    const model = config?.textModel || 'qwen-turbo';
    
    try {
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            max_tokens: 2000,
            temperature: 0.7,
            result_format: 'message'
          }
        })
      });

      if (!response.ok) {
        let errorMessage = 'Text generation failed';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error?.message || error.error?.code || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Qwen API Error:', error);
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.output && data.output.choices && data.output.choices.length > 0) {
        return data.output.choices[0].message.content;
      }
      
      throw new Error("No text generated");
    } catch (error: any) {
      console.error("Qwen Text Gen Error:", error);
      // 处理 "Failed to fetch" 错误（通常是 CORS 或网络问题）
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        throw new Error('网络请求失败：可能是 CORS 限制或网络连接问题。通义千问 API 可能需要通过服务器端代理调用。');
      }
      throw error;
    }
  }
}

