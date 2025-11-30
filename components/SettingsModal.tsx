import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle, Sparkles } from 'lucide-react';
import { TRANSLATIONS, AI_PROVIDERS } from '../constants';
import { getSelectedProvider, getApiKey, saveApiKey } from '../services/aiService';
import type { AIProvider } from '../services/aiService';

interface SettingsModalProps {
  onClose: () => void;
  lang: 'zh' | 'en';
  onApiKeySet: () => void;
}

export const SettingsModal = ({ onClose, lang, onApiKeySet }: SettingsModalProps) => {
  const t = TRANSLATIONS[lang];
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');

  useEffect(() => {
    // 从localStorage加载已保存的提供商、API密钥和模型
    const provider = getSelectedProvider();
    setSelectedProvider(provider);
    
    const savedKey = getApiKey(provider);
    if (savedKey) {
      setApiKey(savedKey);
    }
    
    const savedModel = localStorage.getItem('ai_model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // 当提供商改变时，加载对应的 API Key
  useEffect(() => {
    const savedKey = getApiKey(selectedProvider);
    setApiKey(savedKey || '');
    
    // 自动选择该提供商的第一个模型
    const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0].id);
    }
  }, [selectedProvider]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(selectedProvider, apiKey.trim());
      localStorage.setItem('ai_model', selectedModel);
      setSaved(true);
      onApiKeySet();
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(`${selectedProvider}_api_key`);
    setApiKey('');
    onApiKeySet();
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);
  const currentModels = currentProvider?.models || [];
  
  const getApiKeyPlaceholder = () => {
    switch (selectedProvider) {
      case 'gemini':
        return '输入您的 Gemini API Key';
      case 'qwen':
        return '输入您的通义千问 API Key';
      case 'doubao':
        return '输入您的豆包 API Key';
      default:
        return '输入您的 API Key';
    }
  };

  const getApiKeyHelp = () => {
    switch (selectedProvider) {
      case 'gemini':
        return {
          title: '如何获取 Gemini API Key：',
          steps: [
            '访问 Google AI Studio',
            '登录您的 Google 账号',
            '点击 "Create API Key" 创建新的密钥',
            '复制密钥并粘贴到上方输入框'
          ],
          link: 'https://aistudio.google.com/apikey'
        };
      case 'qwen':
        return {
          title: '如何获取通义千问 API Key：',
          steps: [
            '访问 阿里云 DashScope',
            '注册/登录您的账号',
            '创建 API Key',
            '复制密钥并粘贴到上方输入框'
          ],
          link: 'https://dashscope.console.aliyun.com/apiKey'
        };
      case 'doubao':
        return {
          title: '如何获取豆包 API Key：',
          steps: [
            '访问 火山引擎控制台',
            '注册/登录您的账号',
            '创建 API Key',
            '复制密钥并粘贴到上方输入框'
          ],
          link: 'https://console.volcengine.com/ark'
        };
      default:
        return {
          title: '如何获取 API Key：',
          steps: [],
          link: ''
        };
    }
  };

  const help = getApiKeyHelp();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Key size={20} className="text-wechat-green" />
            {t.settings}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* AI 提供商选择 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-wechat-green" />
              AI 提供商
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-wechat-green focus:border-transparent outline-none bg-white"
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            {currentProvider && (
              <p className="text-xs text-gray-500 mt-1">
                {currentProvider.description}
              </p>
            )}
          </div>

          {/* API Key 输入 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {currentProvider?.name} API Key
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getApiKeyPlaceholder()}
                className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-wechat-green focus:border-transparent outline-none"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              您的API密钥将保存在浏览器本地，不会上传到任何服务器。
            </p>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle size={16} />
              <span>API密钥已保存！</span>
            </div>
          )}

          {/* 模型选择 */}
          {currentModels.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-wechat-green" />
                {t.selectModel}
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-wechat-green focus:border-transparent outline-none bg-white"
              >
                {currentModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {currentModels.find(m => m.id === selectedModel) && (
                <p className="text-xs text-gray-500 mt-1">
                  {currentModels.find(m => m.id === selectedModel)?.description}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 bg-wechat-green hover:bg-wechat-dark text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </button>
            {getApiKey(selectedProvider) && (
              <button
                onClick={handleClear}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
              >
                清除
              </button>
            )}
          </div>

          {/* API Key 获取帮助 */}
          {help.steps.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700">
              <p className="font-semibold mb-1">{help.title}</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                {help.steps.map((step, index) => (
                  <li key={index}>
                    {index === 0 && help.link ? (
                      <>访问 <a href={help.link} target="_blank" rel="noopener noreferrer" className="underline">{step}</a></>
                    ) : (
                      step
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

