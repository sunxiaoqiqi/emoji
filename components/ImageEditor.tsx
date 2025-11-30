
import React, { useRef, useState, useEffect } from 'react';
import { Sticker, ToolType, AnimationType, Selection as CustomSelection } from '../types';
import { STICKER_SIZE, FONTS, TRANSLATIONS, ANIMATION_TYPES } from '../constants';
import { loadImage, floodFillTransparency, drawText } from '../utils/imageProcessor';
import { X, Check, Eraser, Move, Type, Wand2, Undo, Trash2, AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter, Zap, Square } from 'lucide-react';

interface ImageEditorProps {
  sticker: Sticker;
  onSave: (url: string, textConfig: Sticker['textConfig'], animationConfig?: Sticker['animationConfig'], selections?: CustomSelection[]) => void;
  onClose: () => void;
  lang: 'zh' | 'en';
}

export const ImageEditor = ({ sticker, onSave, onClose, lang }: ImageEditorProps) => {
  const t = TRANSLATIONS[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('move');
  
  // Image State
  const [imagePos, setImagePos] = useState({ x: 0, y: 0, scale: 1 });
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [editedImageData, setEditedImageData] = useState<ImageData | null>(null); // 保存编辑后的状态

  // Text State - 默认不显示文字，即使sticker有文字也不默认显示
  const [text, setText] = useState('');
  const [textConfig, setTextConfig] = useState(sticker.textConfig || {
    x: STICKER_SIZE / 2,
    y: STICKER_SIZE - 30,
    color: '#000000',
    stroke: '#ffffff',
    fontSize: 32,
    fontFamily: '"Noto Sans SC", sans-serif',
    orientation: 'horizontal' as const
  });

  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<CustomSelection | null>(null);
  const [selections, setSelections] = useState<CustomSelection[]>(sticker.selections || []); // 多个选区
  const [editingSelectionId, setEditingSelectionId] = useState<string | null>(null); // 正在编辑的选区ID

  // Animation State (全局动效，用于没有选区时)
  const [animationConfig, setAnimationConfig] = useState(sticker.animationConfig || {
    type: 'none' as AnimationType,
    enabled: false,
    speed: 5,
    intensity: 5
  });
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);

  // Init
  useEffect(() => {
    const init = async () => {
      const src = sticker.originalUrl || sticker.url;
      if (!src) return;
      const img = await loadImage(src);
      setOriginalImage(img);
      // 重置编辑状态
      setEditedImageData(null);
      setImagePos({ x: 0, y: 0, scale: 1 });
      // 重置文字为空，不默认显示sticker的文字
      setText('');
      // 恢复选区
      setSelections(sticker.selections || []);
      setCurrentSelection(null);
      setEditingSelectionId(null);
    };
    init();
  }, [sticker]);

  // Animation Preview State
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE);

    // 如果有多个选区，使用多选区渲染逻辑
    if (selections.length > 0) {
      // 先绘制静态背景（未选中区域）
      const staticCanvas = document.createElement('canvas');
      staticCanvas.width = STICKER_SIZE;
      staticCanvas.height = STICKER_SIZE;
      const staticCtx = staticCanvas.getContext('2d');
      if (staticCtx) {
        if (editedImageData) {
          staticCtx.putImageData(editedImageData, 0, 0);
        } else {
          staticCtx.save();
          staticCtx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
          staticCtx.scale(imagePos.scale, imagePos.scale);
          staticCtx.translate(imagePos.x, imagePos.y);
          staticCtx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
          staticCtx.restore();
        }
        
        // 应用所有选区的反向遮罩（未选中区域保留）
        const staticData = staticCtx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
        for (const selection of selections) {
          if (!selection.mask) continue;
          const maskData = selection.mask.data;
          for (let i = 0; i < staticData.data.length; i += 4) {
            const maskAlpha = maskData[i + 3] / 255;
            staticData.data[i + 3] *= (1 - maskAlpha); // 反向遮罩
          }
        }
        staticCtx.putImageData(staticData, 0, 0);
        ctx.drawImage(staticCanvas, 0, 0);
      }
      
      // 对每个选区应用各自的动效
      const progress = (animationFrame / 3) * Math.PI * 2;
      for (const selection of selections) {
        if (!selection.mask || !selection.animationConfig || !selection.animationConfig.enabled || selection.animationConfig.type === 'none') continue;
        
        const selSpeedFactor = 1 / (selection.animationConfig.speed * 0.1 + 0.5);
        const selIntensityFactor = selection.animationConfig.intensity / 10;
        
        let selTranslateX = 0;
        let selTranslateY = 0;
        let selRotate = 0;
        let selScale = 1;
        
        switch (selection.animationConfig.type) {
          case 'swing':
            selTranslateX = Math.sin(progress * selSpeedFactor) * 10 * selIntensityFactor;
            break;
          case 'bounce':
            selTranslateY = -Math.abs(Math.sin(progress * selSpeedFactor)) * 15 * selIntensityFactor;
            break;
          case 'rotate':
            selRotate = progress * selSpeedFactor * selIntensityFactor;
            break;
          case 'scale':
            selScale = 1 + Math.sin(progress * selSpeedFactor) * 0.2 * selIntensityFactor;
            break;
          case 'shake':
            selTranslateX = (Math.random() - 0.5) * 8 * selIntensityFactor;
            selTranslateY = (Math.random() - 0.5) * 8 * selIntensityFactor;
            break;
          case 'pulse':
            selScale = 1 + Math.sin(progress * selSpeedFactor * 2) * 0.15 * selIntensityFactor;
            break;
        }
        
        // 创建选中区域的临时canvas
        const selectedCanvas = document.createElement('canvas');
        selectedCanvas.width = STICKER_SIZE;
        selectedCanvas.height = STICKER_SIZE;
        const selectedCtx = selectedCanvas.getContext('2d');
        if (selectedCtx) {
          if (editedImageData) {
            selectedCtx.putImageData(editedImageData, 0, 0);
          } else {
            selectedCtx.save();
            selectedCtx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
            selectedCtx.scale(imagePos.scale, imagePos.scale);
            selectedCtx.translate(imagePos.x, imagePos.y);
            selectedCtx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
            selectedCtx.restore();
          }
          
          // 应用遮罩，只保留选中区域
          const selectedData = selectedCtx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
          const maskData = selection.mask.data;
          for (let i = 0; i < selectedData.data.length; i += 4) {
            const maskAlpha = maskData[i + 3] / 255;
            selectedData.data[i + 3] *= maskAlpha; // 应用遮罩
          }
          selectedCtx.putImageData(selectedData, 0, 0);
          
          // 应用动效变换
          ctx.save();
          ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
          ctx.rotate(selRotate);
          ctx.scale(selScale, selScale);
          ctx.translate(selTranslateX, selTranslateY);
          ctx.drawImage(selectedCanvas, -STICKER_SIZE/2, -STICKER_SIZE/2);
          ctx.restore();
        }
      }
    } else if (animationConfig.enabled && animationConfig.type !== 'none') {
      // 没有选区，使用全局动效
      const progress = (animationFrame / 3) * Math.PI * 2;
      const speedFactor = 1 / (animationConfig.speed * 0.1 + 0.5);
      const intensityFactor = animationConfig.intensity / 10;
      
      let translateX = 0;
      let translateY = 0;
      let rotate = 0;
      let scale = 1;
      
      switch (animationConfig.type) {
        case 'swing':
          translateX = Math.sin(progress * speedFactor) * 10 * intensityFactor;
          break;
        case 'bounce':
          translateY = -Math.abs(Math.sin(progress * speedFactor)) * 15 * intensityFactor;
          break;
        case 'rotate':
          rotate = progress * speedFactor * intensityFactor;
          break;
        case 'scale':
          scale = 1 + Math.sin(progress * speedFactor) * 0.2 * intensityFactor;
          break;
        case 'shake':
          translateX = (Math.random() - 0.5) * 8 * intensityFactor;
          translateY = (Math.random() - 0.5) * 8 * intensityFactor;
          break;
        case 'pulse':
          scale = 1 + Math.sin(progress * speedFactor * 2) * 0.15 * intensityFactor;
          break;
      }
      
      // 如果没有选区，对整个图片应用动效（旧逻辑，兼容性保留）
      // 注意：现在应该使用 selections 数组，这个分支主要用于向后兼容
      if (false) { // 禁用旧逻辑，使用 selections 数组
        // 先绘制静态背景（未选中区域）
        const staticCanvas = document.createElement('canvas');
        staticCanvas.width = STICKER_SIZE;
        staticCanvas.height = STICKER_SIZE;
        const staticCtx = staticCanvas.getContext('2d');
        if (staticCtx) {
          if (editedImageData) {
            staticCtx.putImageData(editedImageData, 0, 0);
          } else {
            staticCtx.save();
            staticCtx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
            staticCtx.scale(imagePos.scale, imagePos.scale);
            staticCtx.translate(imagePos.x, imagePos.y);
            staticCtx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
            staticCtx.restore();
          }
          
          // 应用反向遮罩，只保留未选中区域
          const staticData = staticCtx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
          const maskData = selectionMask.data;
          for (let i = 0; i < staticData.data.length; i += 4) {
            const maskAlpha = maskData[i + 3] / 255; // 遮罩的alpha值
            staticData.data[i + 3] *= (1 - maskAlpha); // 反向遮罩：未选中区域保留
          }
          staticCtx.putImageData(staticData, 0, 0);
          ctx.drawImage(staticCanvas, 0, 0);
        }
        
        // 创建选中区域的临时canvas（应用动效）
        const selectedCanvas = document.createElement('canvas');
        selectedCanvas.width = STICKER_SIZE;
        selectedCanvas.height = STICKER_SIZE;
        const selectedCtx = selectedCanvas.getContext('2d');
        if (selectedCtx) {
          // 绘制选中区域的内容
          if (editedImageData) {
            selectedCtx.putImageData(editedImageData, 0, 0);
          } else {
            selectedCtx.save();
            selectedCtx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
            selectedCtx.scale(imagePos.scale, imagePos.scale);
            selectedCtx.translate(imagePos.x, imagePos.y);
            selectedCtx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
            selectedCtx.restore();
          }
          
          // 应用遮罩，只保留选中区域
          const selectedData = selectedCtx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
          const maskData = selectionMask.data;
          for (let i = 0; i < selectedData.data.length; i += 4) {
            const maskAlpha = maskData[i + 3] / 255; // 遮罩的alpha值
            selectedData.data[i + 3] *= maskAlpha; // 应用遮罩：只保留选中区域
          }
          selectedCtx.putImageData(selectedData, 0, 0);
          
          // 应用动效变换
          ctx.save();
          ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
          ctx.rotate(rotate);
          ctx.scale(scale, scale);
          ctx.translate(translateX, translateY);
          ctx.drawImage(selectedCanvas, -STICKER_SIZE/2, -STICKER_SIZE/2);
          ctx.restore();
        }
      } else {
        // 没有选区，对整个图片应用动效
        ctx.save();
        ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
        ctx.rotate(rotate);
        ctx.scale(scale, scale);
        ctx.translate(translateX, translateY);
        
        // 如果有编辑后的图像数据，需要先绘制到临时canvas
        if (editedImageData) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = STICKER_SIZE;
          tempCanvas.height = STICKER_SIZE;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(editedImageData, 0, 0);
            ctx.drawImage(tempCanvas, -STICKER_SIZE/2, -STICKER_SIZE/2);
          }
        } else {
          ctx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
        }
        ctx.restore();
      }
    } else {
      // 静态显示
      if (editedImageData) {
        ctx.putImageData(editedImageData, 0, 0);
      } else {
        ctx.save();
        ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
        ctx.scale(imagePos.scale, imagePos.scale);
        ctx.translate(imagePos.x, imagePos.y);
        ctx.drawImage(originalImage, -originalImage.width/2, -originalImage.height/2);
        ctx.restore();
      }
    }
    
    // 绘制文字（文字不参与动画）- 只有当文字不为空时才绘制
    if (text && text.trim() && (activeTool !== 'text' || !isDragging)) {
        drawText(ctx, text, textConfig.x, textConfig.y, textConfig);
    }
    
  }, [originalImage, imagePos, text, textConfig, activeTool, isDragging, editedImageData, animationConfig, animationFrame, currentSelection, selections]);

  // Animation Preview Loop
  useEffect(() => {
    // 检查是否有启用的动效（全局或选区）
    const hasEnabledAnimation = 
      (animationConfig.enabled && animationConfig.type !== 'none') ||
      selections.some(s => s.animationConfig?.enabled && s.animationConfig?.type !== 'none');
    
    if (hasEnabledAnimation) {
      // 使用最快的速度
      const maxSpeed = Math.max(
        animationConfig.enabled ? animationConfig.speed : 0,
        ...selections.map(s => s.animationConfig?.speed || 0)
      );
      const delay = Math.max(50, 200 - maxSpeed * 15);
      animationRef.current = window.setInterval(() => {
        setAnimationFrame(prev => (prev + 1) % 3);
      }, delay);
      
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    } else {
      setAnimationFrame(0);
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [animationConfig.enabled, animationConfig.type, animationConfig.speed, selections]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPos({ x, y });

    if (activeTool === 'select') {
      // 开始框选
      setSelectionStart({ x, y });
      setCurrentSelection(null);
      setSelectionMask(null);
    } else if (activeTool === 'magic-wand') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas) {
        // 确保当前画布有内容
        if (!editedImageData) {
          // 先绘制当前状态到画布（使用透明背景）
          ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE);
          ctx.save();
          ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
          ctx.scale(imagePos.scale, imagePos.scale);
          ctx.translate(imagePos.x, imagePos.y);
          ctx.drawImage(originalImage!, -originalImage!.width/2, -originalImage!.height/2);
          ctx.restore();
        }
        // 执行魔法棒（将选中区域变透明）
        floodFillTransparency(ctx, Math.floor(x), Math.floor(y));
        // 保存编辑后的状态
        const imageData = ctx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
        setEditedImageData(imageData);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'select' && selectionStart) {
      // 更新选区
      const minX = Math.min(selectionStart.x, x);
      const minY = Math.min(selectionStart.y, y);
      const maxX = Math.max(selectionStart.x, x);
      const maxY = Math.max(selectionStart.y, y);
      
      const selection: CustomSelection = {
        id: `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'rect',
        x: Math.max(0, minX),
        y: Math.max(0, minY),
        width: Math.min(STICKER_SIZE, maxX) - Math.max(0, minX),
        height: Math.min(STICKER_SIZE, maxY) - Math.max(0, minY),
      };
      setCurrentSelection(selection);
    } else if (activeTool === 'move') {
       // 移动时，如果有编辑状态，需要重置（因为位置变了）
       if (editedImageData) {
         setEditedImageData(null);
       }
       const dx = (x - lastPos.x) / imagePos.scale;
       const dy = (y - lastPos.y) / imagePos.scale;
       setImagePos(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
    } else if (activeTool === 'eraser') {
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d', { willReadFrequently: true });
       if (ctx && canvas) {
          // 确保当前画布有内容
          if (!editedImageData) {
            // 先绘制当前状态到画布
            ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE);
            ctx.save();
            ctx.translate(STICKER_SIZE/2, STICKER_SIZE/2);
            ctx.scale(imagePos.scale, imagePos.scale);
            ctx.translate(imagePos.x, imagePos.y);
            ctx.drawImage(originalImage!, -originalImage!.width/2, -originalImage!.height/2);
            ctx.restore();
            // 保存初始编辑状态
            const initialData = ctx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
            setEditedImageData(initialData);
          }
          // 执行橡皮擦
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          // 保存编辑后的状态
          const imageData = ctx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
          setEditedImageData(imageData);
       }
    } else if (activeTool === 'text') {
        setTextConfig(p => ({ ...p, x, y }));
    }

    setLastPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    // 如果是在选择工具下，完成选区并生成遮罩
    if (activeTool === 'select') {
      if (currentSelection && currentSelection.width > 0 && currentSelection.height > 0) {
        const mask = generateSelectionMask(currentSelection);
        if (mask) {
          // 创建新选区，使用当前全局动效配置作为默认值
          const newSelection: CustomSelection = {
            ...currentSelection,
            mask,
            animationConfig: {
              type: animationConfig.type,
              enabled: animationConfig.enabled,
              speed: animationConfig.speed,
              intensity: animationConfig.intensity
            }
          };
          setSelections(prev => [...prev, newSelection]);
          setCurrentSelection(null);
          setEditingSelectionId(newSelection.id);
        }
      } else {
        // 如果选区太小，清除
        setCurrentSelection(null);
      }
      setSelectionStart(null);
    }
  };

  // 生成选区遮罩
  const generateSelectionMask = (selection: CustomSelection): ImageData | null => {
    if (!selection || selection.width <= 0 || selection.height <= 0) return null;
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = STICKER_SIZE;
    maskCanvas.height = STICKER_SIZE;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;
    
    // 创建遮罩：选中区域为白色（不透明），其他为黑色（透明）
    maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    maskCtx.fillRect(0, 0, STICKER_SIZE, STICKER_SIZE);
    maskCtx.fillStyle = 'rgba(255, 255, 255, 255)';
    
    // 确保选区在画布范围内
    const x = Math.max(0, Math.min(selection.x, STICKER_SIZE));
    const y = Math.max(0, Math.min(selection.y, STICKER_SIZE));
    const w = Math.max(1, Math.min(selection.width, STICKER_SIZE - x));
    const h = Math.max(1, Math.min(selection.height, STICKER_SIZE - y));
    
    maskCtx.fillRect(x, y, w, h);
    
    const maskData = maskCtx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
    console.log('选区遮罩已生成', { x, y, w, h });
    return maskData;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure text is drawn (only if text is not empty)
    if (text && text.trim()) {
      drawText(ctx, text, textConfig.x, textConfig.y, textConfig);
    }

    // 保存时传递选区信息
    const finalConfig = animationConfig.enabled ? animationConfig : undefined;
    onSave(canvas.toDataURL('image/png'), textConfig, finalConfig, selections.length > 0 ? selections : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-700">{t.settings}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 bg-gray-100 p-6 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Transparency Grid Bg */}
             <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
                    backgroundSize: '20px 20px'
             }}></div>

             <div className="relative shadow-lg border border-gray-300 bg-transparent" style={{ width: STICKER_SIZE, height: STICKER_SIZE }}>
                 <canvas 
                    ref={canvasRef}
                    width={STICKER_SIZE}
                    height={STICKER_SIZE}
                    className={`cursor-${activeTool === 'move' ? 'move' : activeTool === 'text' ? 'text' : activeTool === 'select' ? 'crosshair' : 'crosshair'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                 />
                 
                 {/* Text Overlay Indicator during drag */}
                 {activeTool === 'text' && (
                     <div 
                        className="absolute pointer-events-none whitespace-nowrap border border-dashed border-blue-500"
                        style={{ 
                            left: textConfig.x, 
                            top: textConfig.y, 
                            width: textConfig.orientation === 'vertical' ? textConfig.fontSize : 'auto',
                            height: textConfig.orientation === 'vertical' ? 'auto' : textConfig.fontSize,
                            transform: 'translate(-50%, -50%)',
                        }}
                     ></div>
                 )}
                 
                 {/* Selection Rectangle Overlay - 当前正在绘制的选区 */}
                 {(activeTool === 'select' && (currentSelection || (selectionStart && isDragging))) && (
                     <div 
                        className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/20 z-30"
                        style={{ 
                            left: currentSelection ? currentSelection.x : (selectionStart ? Math.min(selectionStart.x, lastPos.x) : 0), 
                            top: currentSelection ? currentSelection.y : (selectionStart ? Math.min(selectionStart.y, lastPos.y) : 0), 
                            width: currentSelection ? currentSelection.width : (selectionStart ? Math.abs(lastPos.x - selectionStart.x) : 0),
                            height: currentSelection ? currentSelection.height : (selectionStart ? Math.abs(lastPos.y - selectionStart.y) : 0),
                        }}
                     ></div>
                 )}
                 
                 {/* 已保存的选区显示 */}
                 {selections.map((sel, idx) => (
                     <div 
                        key={sel.id}
                        className={`absolute pointer-events-none border-2 z-20 ${editingSelectionId === sel.id ? 'border-green-500 bg-green-500/20' : 'border-blue-300 bg-blue-300/10'}`}
                        style={{ 
                            left: sel.x, 
                            top: sel.y, 
                            width: sel.width,
                            height: sel.height,
                        }}
                     >
                        <div className="absolute -top-5 left-0 text-xs bg-blue-500 text-white px-1 rounded">
                            选区{idx + 1}
                        </div>
                     </div>
                 ))}
             </div>
             
             <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                {activeTool === 'move' && t.dragPan}
                {activeTool === 'select' && '拖拽框选区域，只对选中区域应用动效'}
                {activeTool === 'magic-wand' && t.clickColor}
                {activeTool === 'eraser' && t.dragErase}
                {activeTool === 'text' && t.dragText}
             </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white border-t border-gray-200 space-y-4">
            {/* Tools */}
            <div className="flex justify-center gap-4">
                {[
                    { id: 'move', icon: Move, label: t.toolMove },
                    { id: 'select', icon: Square, label: '选择区域' },
                    { id: 'magic-wand', icon: Wand2, label: t.toolWand },
                    { id: 'eraser', icon: Eraser, label: t.toolEraser },
                    { id: 'text', icon: Type, label: t.toolText },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTool(t.id as ToolType)}
                        className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] transition-colors ${activeTool === t.id ? 'bg-wechat-green text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <t.icon size={20} />
                        <span className="text-[10px] mt-1 font-medium whitespace-nowrap">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Sub-options */}
            {activeTool === 'move' && (
                <div className="flex items-center justify-center gap-4">
                    <span className="text-xs font-bold text-gray-500">{t.zoom}</span>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1" 
                        value={imagePos.scale}
                        onChange={(e) => setImagePos({...imagePos, scale: parseFloat(e.target.value)})}
                        className="w-32 accent-wechat-green"
                    />
                </div>
            )}

            {activeTool === 'text' && (
                <div className="space-y-3">
                    <input 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Enter text..."
                    />
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
                         {/* Font Selection */}
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t.font}</span>
                            <select 
                                value={textConfig.fontFamily}
                                onChange={(e) => setTextConfig({...textConfig, fontFamily: e.target.value})}
                                className="text-xs border rounded p-1 max-w-[100px]"
                            >
                                {FONTS.map(f => (
                                    <option key={f.value} value={f.value}>{f.name}</option>
                                ))}
                            </select>
                         </div>

                         {/* Orientation */}
                         <button 
                            onClick={() => setTextConfig(c => ({...c, orientation: c.orientation === 'vertical' ? 'horizontal' : 'vertical'}))}
                            className={`flex items-center gap-1 text-xs border rounded px-2 py-1 ${textConfig.orientation === 'vertical' ? 'bg-gray-200' : ''}`}
                         >
                            {textConfig.orientation === 'vertical' ? <AlignVerticalJustifyCenter size={14}/> : <AlignHorizontalJustifyCenter size={14}/>}
                            {t.vertical}
                         </button>

                         {/* Size */}
                         <div className="flex items-center gap-1">
                             <span className="text-xs text-gray-500">{t.size}</span>
                             <input type="number" className="w-10 border rounded px-1 text-xs" value={textConfig.fontSize} onChange={e => setTextConfig({...textConfig, fontSize: parseInt(e.target.value)})} />
                         </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <label className="flex items-center gap-1 text-xs">
                            {t.fill} <input type="color" value={textConfig.color} onChange={e => setTextConfig({...textConfig, color: e.target.value})} />
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                            {t.stroke} <input type="color" value={textConfig.stroke} onChange={e => setTextConfig({...textConfig, stroke: e.target.value})} />
                        </label>
                    </div>
                </div>
            )}

            {/* Animation Options */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Zap size={16} className="text-wechat-green" />
                        {t.animation}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={animationConfig.enabled}
                            onChange={(e) => setAnimationConfig({...animationConfig, enabled: e.target.checked})}
                            className="w-4 h-4 text-wechat-green rounded focus:ring-wechat-green"
                        />
                        <span className="text-xs text-gray-600">{t.enableAnimation}</span>
                    </label>
                </div>
                
                {/* 选区列表 */}
                {selections.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-600">已创建的选区 ({selections.length})</div>
                        {selections.map((sel, idx) => (
                            <div key={sel.id} className={`border rounded-lg p-2 ${editingSelectionId === sel.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">选区 {idx + 1} ({Math.round(sel.width)}×{Math.round(sel.height)})</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setEditingSelectionId(editingSelectionId === sel.id ? null : sel.id)}
                                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            {editingSelectionId === sel.id ? '完成' : '编辑'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelections(prev => prev.filter(s => s.id !== sel.id));
                                                if (editingSelectionId === sel.id) setEditingSelectionId(null);
                                            }}
                                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                                {editingSelectionId === sel.id && sel.animationConfig && (
                                    <div className="space-y-2 mt-2">
                                        <label className="flex items-center gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={sel.animationConfig.enabled}
                                                onChange={(e) => {
                                                    setSelections(prev => prev.map(s => 
                                                        s.id === sel.id 
                                                            ? { ...s, animationConfig: { ...s.animationConfig!, enabled: e.target.checked } }
                                                            : s
                                                    ));
                                                }}
                                                className="w-3 h-3"
                                            />
                                            <span>启用动效</span>
                                        </label>
                                        {sel.animationConfig.enabled && (
                                            <>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">动效类型</label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {ANIMATION_TYPES.filter(a => a.id !== 'none').map((anim) => (
                                                            <button
                                                                key={anim.id}
                                                                onClick={() => {
                                                                    setSelections(prev => prev.map(s => 
                                                                        s.id === sel.id 
                                                                            ? { ...s, animationConfig: { ...s.animationConfig!, type: anim.id as AnimationType } }
                                                                            : s
                                                                    ));
                                                                }}
                                                                className={`text-xs py-1 px-1 rounded border ${
                                                                    sel.animationConfig?.type === anim.id
                                                                        ? 'bg-wechat-green text-white border-wechat-green'
                                                                        : 'bg-white text-gray-600 border-gray-200'
                                                                }`}
                                                            >
                                                                {anim.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">速度: {sel.animationConfig.speed}</label>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        value={sel.animationConfig.speed}
                                                        onChange={(e) => {
                                                            setSelections(prev => prev.map(s => 
                                                                s.id === sel.id 
                                                                    ? { ...s, animationConfig: { ...s.animationConfig!, speed: parseInt(e.target.value) } }
                                                                    : s
                                                            ));
                                                        }}
                                                        className="w-full accent-wechat-green"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">强度: {sel.animationConfig.intensity}</label>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        value={sel.animationConfig.intensity}
                                                        onChange={(e) => {
                                                            setSelections(prev => prev.map(s => 
                                                                s.id === sel.id 
                                                                    ? { ...s, animationConfig: { ...s.animationConfig!, intensity: parseInt(e.target.value) } }
                                                                    : s
                                                            ));
                                                        }}
                                                        className="w-full accent-wechat-green"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {currentSelection && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                        ⚠ 正在绘制选区，松开鼠标完成创建
                    </div>
                )}

                {animationConfig.enabled && (
                    <div className="space-y-3">
                        {/* Animation Type */}
                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">{t.animationType}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {ANIMATION_TYPES.filter(a => a.id !== 'none').map((anim) => (
                                    <button
                                        key={anim.id}
                                        onClick={() => setAnimationConfig({...animationConfig, type: anim.id as AnimationType})}
                                        className={`text-xs py-2 px-1 rounded-md border transition-all ${
                                            animationConfig.type === anim.id
                                                ? 'bg-wechat-green text-white border-wechat-green'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="text-lg mb-1">{anim.icon}</div>
                                        <div>{anim.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Speed */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                {t.animationSpeed}: {animationConfig.speed}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={animationConfig.speed}
                                onChange={(e) => setAnimationConfig({...animationConfig, speed: parseInt(e.target.value)})}
                                className="w-full accent-wechat-green"
                            />
                        </div>

                        {/* Intensity */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                {t.animationIntensity}: {animationConfig.intensity}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={animationConfig.intensity}
                                onChange={(e) => setAnimationConfig({...animationConfig, intensity: parseInt(e.target.value)})}
                                className="w-full accent-wechat-green"
                            />
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowPreview(true)}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors"
                >
                    预览效果
                </button>
                <button 
                    onClick={handleSave}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors"
                >
                    {t.save}
                </button>
            </div>
            
            {/* 预览模态框 */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">动效预览</h3>
                            <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="border-2 border-gray-300 rounded-lg p-2 bg-transparent" style={{ width: STICKER_SIZE, height: STICKER_SIZE }}>
                                <canvas 
                                    ref={canvasRef}
                                    width={STICKER_SIZE}
                                    height={STICKER_SIZE}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">预览当前配置的动效效果</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
