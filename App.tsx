
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Wand2, Download, Upload, Image as ImageIcon, 
  Settings, Loader2, RefreshCw, Type, AlertCircle, 
  Layers, Grid, Edit2, Plus, Trash2, Languages
} from 'lucide-react';
import { 
  Sticker, PackMetadata, GenerationConfig, ProcessingStatus, Language, AppMode, Selection as CustomSelection
} from './types';
import { DEFAULT_PHRASES, STICKER_SIZE, THUMB_SIZE, ICON_SIZE, TRANSLATIONS, AI_MODELS } from './constants';
import { getSelectedModel } from './services/geminiService';
import { getSelectedProvider, getApiKey, getAIService } from './services/aiService';
import { AI_PROVIDERS } from './constants';
import { checkApiKey, openKeySelection, generateStickerImage, generatePackMetadata } from './services/geminiService';
import { processFinalSticker, generateThumbnail } from './utils/imageProcessor';
import { generateGifFromImage } from './utils/animationGenerator';
import { ImageEditor } from './components/ImageEditor';
import { GridImporter } from './components/GridImporter';
import { SettingsModal } from './components/SettingsModal';

// --- Subcomponents ---

const Header = ({ 
    lang, 
    setLang, 
    mode, 
    setMode,
    onSettingsClick,
    currentModel,
    currentProvider
}: { 
    lang: Language, 
    setLang: (l: Language) => void,
    mode: AppMode,
    setMode: (m: AppMode) => void,
    onSettingsClick: () => void,
    currentModel: string,
    currentProvider: string
}) => {
    const t = TRANSLATIONS[lang];
    return (
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed w-full top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-wechat-green p-2 rounded-lg text-white">
                <ImageIcon size={20} />
            </div>
            <h1 className="font-bold text-xl text-gray-800 tracking-tight hidden md:block">WeMoji Maker</h1>
          </div>
          
          {/* Mode Switcher in Header */}
          <div className="bg-gray-100 p-1 rounded-lg flex gap-1 ml-4">
               <button 
                onClick={() => setMode('grid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${mode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <Grid size={14} />
                 {t.modeGrid}
               </button>
               <button 
                onClick={() => setMode('ai')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${mode === 'ai' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <Wand2 size={14} />
                 {t.modeAI}
               </button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <Languages size={16} />
            {lang === 'zh' ? '中文' : 'EN'}
          </button>
          
          {/* Only show API key setting if in AI mode */}
          {mode === 'ai' && (
            <div className="flex items-center gap-3">
              {/* 显示当前提供商和模型 */}
              <div className="text-xs text-gray-500 hidden md:block">
                {(() => {
                  const provider = AI_PROVIDERS.find(p => p.id === currentProvider);
                  const model = provider?.models.find(m => m.id === currentModel);
                  return model ? `${provider?.name} - ${model.name}` : '未选择模型';
                })()}
              </div>
              <button onClick={onSettingsClick} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title={t.settings}>
                <Settings size={20} />
              </button>
            </div>
          )}
        </div>
      </header>
    );
};

const Sidebar = ({ 
  mode,
  config, 
  setConfig, 
  phrases, 
  onPhraseChange,
  onAddPhrase,
  onRemovePhrase,
  isGenerating, 
  onGenerate,
  onOpenGridImporter,
  lang
}: {
  mode: AppMode;
  config: GenerationConfig;
  setConfig: any;
  phrases: string[];
  onPhraseChange: (idx: number, val: string) => void;
  onAddPhrase: () => void;
  onRemovePhrase: (idx: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onOpenGridImporter: () => void;
  lang: Language;
}) => {
  const t = TRANSLATIONS[lang];

  if (mode === 'grid') {
      return (
        <div className="w-80 bg-white border-r border-gray-200 h-full p-6 flex flex-col gap-6 fixed left-0 top-16 bottom-0 z-40">
             <div className="text-center mt-10">
                 <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-wechat-green">
                     <Grid size={40} />
                 </div>
                 <h2 className="text-lg font-bold text-gray-800 mb-2">{t.modeGrid}</h2>
                 <p className="text-sm text-gray-500 mb-8">Upload an image and slice it into stickers.</p>
                 
                 <button
                    onClick={onOpenGridImporter}
                    className="w-full bg-wechat-green hover:bg-wechat-dark text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-100"
                 >
                    <Upload size={18} />
                    {t.importGrid}
                </button>
             </div>
        </div>
      );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col fixed left-0 top-16 bottom-0 z-40">
      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Character Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              1. {t.charDesc}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-wechat-green focus:border-transparent outline-none resize-none h-24"
            placeholder={t.placeholderDesc}
            value={config.characterDesc}
            onChange={(e) => setConfig({ ...config, characterDesc: e.target.value })}
          />
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">2. {t.style}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
                { id: 'flat', label: t.styleFlat }, 
                { id: '3d', label: t.style3d }, 
                { id: 'sketch', label: t.styleSketch }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setConfig({ ...config, style: s.id as any })}
                className={`text-xs py-2 px-1 rounded-md border capitalize transition-all ${
                  config.style === s.id
                    ? 'bg-wechat-green text-white border-wechat-green shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phrases Input */}
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700">3. {t.statusList}</label>
            <span className="text-xs text-gray-400">{phrases.length}</span>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {phrases.map((phrase, idx) => (
              <div key={idx} className="flex gap-2 group">
                  <input
                  type="text"
                  value={phrase}
                  onChange={(e) => onPhraseChange(idx, e.target.value)}
                  placeholder={`Sticker ${idx + 1}`}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-wechat-green outline-none"
                  />
                  <button 
                      onClick={() => onRemovePhrase(idx)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
            ))}
            <button 
              onClick={onAddPhrase}
              className="w-full border border-dashed border-gray-300 py-2 rounded-md text-gray-400 hover:border-wechat-green hover:text-wechat-green text-sm flex items-center justify-center gap-1 transition-colors"
            >
              <Plus size={16} /> {t.addSticker}
            </button>
          </div>
        </div>
      </div>

      {/* 固定在底部的生成按钮 - 始终显示 */}
      <div className="p-6 pt-0 border-t border-gray-100 bg-white shrink-0">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full bg-wechat-green hover:bg-wechat-dark text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
          {t.genAll}
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [mode, setMode] = useState<AppMode>('grid'); // Default to Grid mode
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [currentModel, setCurrentModel] = useState(getSelectedModel());
  const [currentProvider, setCurrentProvider] = useState(getSelectedProvider());
  
  // Sticker State
  const [stickers, setStickers] = useState<Sticker[]>(
    DEFAULT_PHRASES.map((txt, i) => ({
      id: `s-${i}`,
      url: '',
      text: txt,
      isEdited: false,
      status: 'empty'
    }))
  );
  
  const [packMeta, setPackMeta] = useState<PackMetadata>({
    name: '表情包',
    description: 'AI Generated Stickers',
    author: 'AI Creator'
  });

  const [config, setConfig] = useState<GenerationConfig>({
    characterDesc: '',
    style: 'flat',
    mode: 'static'
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [showGridImporter, setShowGridImporter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    checkApiKey().then(setApiKeyReady);
    // 监听模型和提供商变化
    const handleStorageChange = () => {
      setCurrentModel(getSelectedModel());
      setCurrentProvider(getSelectedProvider());
    };
    window.addEventListener('storage', handleStorageChange);
    // 定期检查（因为同窗口的localStorage变化不会触发storage事件）
    const interval = setInterval(() => {
      const newModel = getSelectedModel();
      const newProvider = getSelectedProvider();
      if (newModel !== currentModel) {
        setCurrentModel(newModel);
      }
      if (newProvider !== currentProvider) {
        setCurrentProvider(newProvider);
      }
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentModel, currentProvider]);

  const t = TRANSLATIONS[lang];

  const handleApiKeyRequest = async () => {
    setShowSettings(true);
  };

  const handleApiKeySet = async () => {
    const ready = await checkApiKey();
    setApiKeyReady(ready);
      setCurrentModel(getSelectedModel()); // 更新当前模型
      setCurrentProvider(getSelectedProvider()); // 更新当前提供商
    if(ready) {
      setErrorMsg(null);
    }
  };

  const handleGenerateAll = async () => {
    // 检查是否填写了人物描述
    if (!config.characterDesc.trim()) {
      setErrorMsg('请先填写人物描述');
      return;
    }
    
    // 检查是否有表情文案
    if (stickers.length === 0 || !stickers.some(s => s.text.trim())) {
      setErrorMsg('请至少添加一个表情文案');
      return;
    }
    
    // 直接开始生成，不提前检查 API Key
    // 如果 API Key 未配置，会在生成过程中捕获错误并提示
    setStatus('generating_images');
    setErrorMsg(null);
    setStickers(prev => prev.map(s => ({ ...s, status: 'loading' })));

    try {
      generatePackMetadata(config.characterDesc, stickers.map(s => s.text))
        .then(meta => setPackMeta(prev => ({ ...prev, ...meta })))
        .catch(err => console.error("Meta gen failed", err));

      const newStickers = [...stickers];
      const promises = newStickers.map(async (sticker) => {
        try {
          const imgUrl = await generateStickerImage(config.characterDesc, sticker.text, config.style);
          return { 
            ...sticker, 
            url: imgUrl, 
            originalUrl: imgUrl, 
            status: 'generated' as const 
          };
        } catch (e: any) {
          // 记录详细错误信息
          const errorMsg = e?.message || String(e);
          console.error(`Failed to generate sticker ${sticker.text}:`, e);
          console.error(`Error details:`, {
            message: errorMsg,
            stack: e?.stack,
            response: e?.response
          });
          // 保存错误信息到 sticker 中，以便后续显示
          return { 
            ...sticker, 
            status: 'error' as const,
            errorMessage: errorMsg // 临时存储错误信息
          };
        }
      });

      const results = await Promise.all(promises);
      setStickers(results);
      
      // 检查是否有成功的生成
      const hasSuccess = results.some(s => s.status === 'generated');
      if (!hasSuccess && results.length > 0) {
        // 检查是否是因为 API Key 问题
        const provider = getSelectedProvider();
        const apiKey = getApiKey(provider);
        const service = getAIService();
        
        // 检查第一个失败的表情包的错误信息
        const firstError = results.find(s => s.status === 'error');
        const errorMessages = results
          .filter(s => s.status === 'error')
          .map(s => (s as any).errorMessage)
          .filter(Boolean);
        
        console.log('生成结果:', results);
        console.log('当前提供商:', provider);
        console.log('API Key 是否存在:', !!apiKey);
        console.log('服务是否初始化:', !!service);
        console.log('错误信息:', errorMessages);
        
        // 构建错误消息
        let errorMsg = '生成失败';
        if (errorMessages.length > 0) {
          // 显示第一个错误信息
          const firstErrorMsg = errorMessages[0];
          if (firstErrorMsg.includes('CORS') || firstErrorMsg.includes('网络请求失败') || firstErrorMsg.includes('Failed to fetch')) {
            errorMsg = `生成失败：${firstErrorMsg}。通义千问 API 可能不支持直接从浏览器调用，建议使用 Gemini 或其他支持浏览器调用的 API。`;
          } else if (firstErrorMsg.includes('401') || firstErrorMsg.includes('unauthorized') || firstErrorMsg.includes('Invalid') || firstErrorMsg.includes('invalid')) {
            errorMsg = `生成失败：API Key 无效或已过期。错误信息：${firstErrorMsg}`;
          } else if (firstErrorMsg.includes('403') || firstErrorMsg.includes('forbidden')) {
            errorMsg = `生成失败：API Key 没有权限。错误信息：${firstErrorMsg}`;
          } else if (firstErrorMsg.includes('429') || firstErrorMsg.includes('rate limit')) {
            errorMsg = `生成失败：API 调用频率过高，请稍后再试。错误信息：${firstErrorMsg}`;
          } else {
            errorMsg = `生成失败：${firstErrorMsg}`;
          }
        } else if (!apiKey) {
          errorMsg = '生成失败：请先配置 API Key。点击顶部设置按钮进行配置。';
        } else if (!service) {
          errorMsg = '生成失败：API Key 配置无效，请检查 API Key 是否正确。';
        } else {
          errorMsg = '生成失败，请检查网络连接和 API Key 是否正确。如果问题持续，请查看浏览器控制台的错误信息。';
        }
        
        setErrorMsg(errorMsg);
        setStatus('error');
      } else {
        setStatus('idle');
      }

    } catch (e: any) {
      console.error("Generation failed:", e);
      
      // 检查是否是 API Key 相关错误
      const provider = getSelectedProvider();
      const apiKey = getApiKey(provider);
      const service = getAIService();
      
      if (!apiKey) {
        setErrorMsg('请先配置 API Key。点击顶部设置按钮进行配置。');
      } else if (!service) {
        setErrorMsg('API Key 配置无效，请检查 API Key 是否正确。');
      } else if (e?.message?.includes('API Key') || e?.message?.includes('not initialized') || e?.message?.includes('unauthorized') || e?.message?.includes('401')) {
        setErrorMsg('API Key 无效或已过期，请检查 API Key 是否正确。');
      } else {
        setErrorMsg(t.failed || "Generation failed. Please try again.");
      }
      setStatus('error');
    }
  };

  const handleGridImport = (images: string[]) => {
    // Replace all stickers with imported ones
    // Dynamic resizing of array
    const newStickers: Sticker[] = images.map((img, i) => ({
        id: `imported-${Date.now()}-${i}`,
        url: img,
        originalUrl: img,
        text: `Sticker ${i+1}`,
        status: 'generated',
        isEdited: false
    }));
    setStickers(newStickers);
  };

  const handleSaveEdit = (newUrl: string, textConfig: Sticker['textConfig'], animationConfig?: Sticker['animationConfig'], selections?: CustomSelection[]) => {
    if (!editingStickerId) return;
    setStickers(prev => prev.map(s => {
        if (s.id === editingStickerId) {
            return {
                ...s,
                url: newUrl,
                textConfig: textConfig,
                animationConfig: animationConfig,
                selections: selections,
                isEdited: true
            };
        }
        return s;
    }));
    setEditingStickerId(null);
  };

  const handleRegenerateSingle = async (index: number) => {
     if (!apiKeyReady) return handleApiKeyRequest();

     setStickers(prev => prev.map((s, i) => i === index ? { ...s, status: 'loading' } : s));
     
     try {
         const sticker = stickers[index];
         const imgUrl = await generateStickerImage(config.characterDesc, sticker.text, config.style);
         setStickers(prev => prev.map((s, i) => i === index ? { 
             ...s, 
             url: imgUrl, 
             originalUrl: imgUrl,
             status: 'generated',
             isEdited: false
         } : s));
     } catch (e) {
        setStickers(prev => prev.map((s, i) => i === index ? { ...s, status: 'error' } : s));
     }
  };

  const handleDownload = async () => {
    setStatus('zipping');
    const zip = new JSZip();
    const folder = zip.folder(`wechat_stickers_${Date.now()}`);
    if (!folder) return;

    try {
      for (let i = 0; i < stickers.length; i++) {
        const s = stickers[i];
        if (s.status === 'generated' && s.url) {
          // 检查是否有动效配置（全局或选区）
          const hasAnimation = (s.animationConfig && s.animationConfig.enabled && s.animationConfig.type !== 'none') ||
                               (s.selections && s.selections.some(sel => sel.animationConfig?.enabled && sel.animationConfig?.type !== 'none'));
          
          if (hasAnimation) {
            // 生成GIF
            try {
              // 准备选区数据
              const selectionsData = s.selections && s.selections.length > 0
                ? s.selections
                    .filter(sel => sel.mask && sel.animationConfig?.enabled && sel.animationConfig?.type !== 'none')
                    .map(sel => ({
                      mask: sel.mask!,
                      animationConfig: sel.animationConfig!
                    }))
                : undefined;
              
              // 不传递文字：如果用户在编辑器中添加了文字，文字已经绘制在 s.url 中了
              // 生成 GIF 时会从 s.url 中提取，不需要再添加文字
              // 这样可以避免添加默认的 sticker.text
              const userText = ''; // 不传递任何文字，文字已经在图片中了
              
              const gifBlob = await generateGifFromImage(
                s.url,
                s.textConfig, // 传递 textConfig 用于位置信息（如果需要），但文字内容为空
                userText, // 不传递文字，避免添加默认的 sticker.text
                s.animationConfig?.type || 'none',
                s.animationConfig?.speed || 5,
                s.animationConfig?.intensity || 5,
                selectionsData
              );
              
              // 将Blob转换为base64
              const reader = new FileReader();
              const base64Gif = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(gifBlob);
              });
              
              folder.file(`sticker_${i + 1}.gif`, base64Gif, { base64: true });
            } catch (gifError) {
              console.error('GIF生成失败或超时，使用PNG:', gifError);
              // 如果GIF生成失败或超时，回退到PNG
              let finalDataUrl = s.url;
              if (!s.isEdited && mode === 'ai') {
                finalDataUrl = await processFinalSticker(s.url, true);
              }
              const base64Data = finalDataUrl.split(',')[1];
              folder.file(`sticker_${i + 1}.png`, base64Data, { base64: true });
            }
          } else {
            // 普通PNG导出
            let finalDataUrl = s.url;
            if (!s.isEdited && mode === 'ai') {
              finalDataUrl = await processFinalSticker(s.url, true);
            }
            const base64Data = finalDataUrl.split(',')[1];
            folder.file(`sticker_${i + 1}.png`, base64Data, { base64: true });
          }
        }
      }

      const infoText = `Name: ${packMeta.name}\nDescription: ${packMeta.description}\nGenerated by WeMoji Maker`;
      folder.file('info.txt', infoText);

      const validSticker = stickers.find(s => s.status === 'generated' && s.url);
      if (validSticker) {
          const iconUrl = await generateThumbnail(validSticker.url, ICON_SIZE);
          folder.file('icon_50x50.png', iconUrl.split(',')[1], { base64: true });

          const thumbUrl = await generateThumbnail(validSticker.url, THUMB_SIZE);
          folder.file('thumb_120x120.png', thumbUrl.split(',')[1], { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packMeta.name || 'stickers'}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      setStatus('done');
    } catch (e) {
      console.error(e);
      setErrorMsg(t.failed);
      setStatus('error');
    }
  };

  return (
    <div className="h-screen bg-wechat-bg flex flex-col pt-16 overflow-hidden">
      <Header 
        lang={lang} 
        setLang={setLang} 
        mode={mode}
        setMode={setMode}
        onSettingsClick={handleApiKeyRequest}
        currentModel={currentModel}
        currentProvider={currentProvider}
      />

      <Sidebar 
        mode={mode}
        config={config} 
        setConfig={setConfig} 
        phrases={stickers.map(s => s.text)}
        onPhraseChange={(idx, val) => {
            setStickers(prev => prev.map((s, i) => i === idx ? { ...s, text: val } : s));
        }}
        onAddPhrase={() => {
            setStickers(prev => [...prev, {
                id: `s-${Date.now()}`,
                url: '',
                text: '',
                isEdited: false,
                status: 'empty'
            }]);
        }}
        onRemovePhrase={(idx) => {
            setStickers(prev => prev.filter((_, i) => i !== idx));
        }}
        isGenerating={status === 'generating_images'}
        onGenerate={handleGenerateAll}
        onOpenGridImporter={() => setShowGridImporter(true)}
        lang={lang}
      />

      <main className="ml-80 flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Pack Metadata */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-dashed border-gray-300 shrink-0">
               {stickers.find(s => s.url) ? (
                 <img src={stickers.find(s => s.url)!.url} className="w-full h-full object-cover rounded-lg opacity-80" alt="Preview" />
               ) : (
                 <ImageIcon size={32} />
               )}
            </div>
            
            <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t.packName}</label>
                        <input 
                        value={packMeta.name}
                        onChange={(e) => setPackMeta({...packMeta, name: e.target.value.slice(0, 5)})}
                        className="text-2xl font-bold text-gray-800 bg-transparent border-b border-gray-200 focus:border-wechat-green outline-none w-full placeholder-gray-300"
                        placeholder="Name"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{t.packDesc}</label>
                    <input 
                      value={packMeta.description}
                      onChange={(e) => setPackMeta({...packMeta, description: e.target.value.slice(0, 80)})}
                      className="text-sm text-gray-600 bg-transparent border-b border-gray-200 focus:border-wechat-green outline-none w-full placeholder-gray-300"
                      placeholder="Enter description..."
                    />
                </div>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
                 <button 
                  onClick={handleDownload}
                  disabled={status === 'zipping' || !stickers.some(s => s.url)}
                  className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:shadow-none transition-all w-40"
                >
                    {status === 'zipping' ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    {t.download}
                 </button>
            </div>
          </div>

          {/* Sticker Grid */}
          <div className="grid grid-cols-4 gap-6">
            {stickers.map((sticker, idx) => (
              <div key={sticker.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow relative">
                <div className="aspect-square bg-white relative flex items-center justify-center p-4">
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                        backgroundSize: '20px 20px'
                    }}></div>
                    
                    {sticker.status === 'loading' ? (
                        <div className="z-10 flex flex-col items-center gap-2 text-wechat-green">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-xs font-medium">{t.processing}</span>
                        </div>
                    ) : sticker.status === 'error' ? (
                         <div className="z-10 flex flex-col items-center gap-2 text-red-400">
                            <AlertCircle size={32} />
                            <span className="text-xs">{t.failed}</span>
                            {mode === 'ai' && (
                                <button onClick={() => handleRegenerateSingle(idx)} className="text-xs underline hover:text-red-600">{t.retry}</button>
                            )}
                        </div>
                    ) : sticker.url ? (
                        <>
                            <img src={sticker.url} alt={sticker.text} className="w-full h-full object-contain z-10 relative" />
                            {/* Overlay Edit Button */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => setEditingStickerId(sticker.id)}
                                    className="bg-white text-gray-800 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                                    title="Edit Sticker"
                                >
                                    <Edit2 size={18} />
                                </button>
                                {mode === 'ai' && (
                                    <button 
                                        onClick={() => handleRegenerateSingle(idx)}
                                        className="bg-white text-gray-800 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                                        title="Regenerate"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="z-10 text-gray-300 flex flex-col items-center">
                            <div className="text-4xl font-bold opacity-20">{idx + 1}</div>
                            <span className="text-xs mt-2">{t.empty}</span>
                        </div>
                    )}
                </div>
                
                {/* Text Indicator (ReadOnly in grid, edited in modal) */}
                <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                    <p className="text-xs font-medium text-gray-600 truncate px-2 min-h-[1.5em]">{sticker.text}</p>
                </div>
              </div>
            ))}
            
            {/* Add Button in AI Mode grid view (redundant with sidebar but nice UX) */}
            {mode === 'ai' && (
                <button 
                    onClick={() => setStickers(prev => [...prev, {
                        id: `s-${Date.now()}`,
                        url: '',
                        text: '',
                        isEdited: false,
                        status: 'empty'
                    }])}
                    className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-wechat-green hover:text-wechat-green transition-colors"
                >
                    <Plus size={32} />
                    <span className="text-xs font-medium mt-2">{t.addSticker}</span>
                </button>
            )}
          </div>
          
          <div className="text-center text-gray-400 text-sm pb-8 pt-8">
            <p>Generated stickers are optimized for WeChat (240x240px transparent PNG).</p>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showGridImporter && (
          <GridImporter 
            onImport={handleGridImport} 
            onClose={() => setShowGridImporter(false)} 
          />
      )}

      {editingStickerId && (
          <ImageEditor 
            sticker={stickers.find(s => s.id === editingStickerId)!}
            onSave={handleSaveEdit}
            onClose={() => setEditingStickerId(null)}
            lang={lang}
          />
      )}

      {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)}
            lang={lang}
            onApiKeySet={handleApiKeySet}
          />
      )}
    </div>
  );
}
