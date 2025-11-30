
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Grid3X3, Move, ZoomIn, ZoomOut, RotateCcw, Wand2, Eraser } from 'lucide-react';
import { sliceCanvas, loadImage, floodFillTransparency } from '../utils/imageProcessor';
import { STICKER_SIZE, TRANSLATIONS } from '../constants';

interface GridImporterProps {
  onImport: (images: string[]) => void;
  onClose: () => void;
}

type EditTool = 'move' | 'magic-wand' | 'eraser';

export const GridImporter = ({ onImport, onClose }: GridImporterProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(4);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<EditTool>('move');
  const [editedImageData, setEditedImageData] = useState<ImageData | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const url = URL.createObjectURL(f);
      const img = await loadImage(url);
      setImageObj(img);
      
      // Auto-fit logic
      // We want to fit the image into the grid initially
      // Grid ratio: cols/rows
      // Image ratio: w/h
      setTransform({ x: 0, y: 0, scale: 1 });
      setEditedImageData(null); // 重置编辑状态
      URL.revokeObjectURL(url);
    }
  };

  // Render Preview Canvas
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size is determined by the grid output requirement (high res)
    // Each cell is 240x240
    canvas.width = cols * STICKER_SIZE;
    canvas.height = rows * STICKER_SIZE;

    // Fill background with checkerboard or gray to indicate "outside" (仅用于预览)
    // 注意：这个背景不会包含在最终切片中
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw Image with Transform
    // 如果有编辑后的图像数据，直接使用它；否则绘制原始图片
    if (editedImageData) {
      // 直接使用编辑后的图像数据（不包含网格线）
      ctx.putImageData(editedImageData, 0, 0);
    } else {
      // 绘制到临时画布，不包含网格线
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);
      
      // Draw centered relative to transform origin
      ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
      ctx.restore();
    }

    // Draw Grid Lines on top (仅用于预览，不会包含在最终切片中)
    ctx.strokeStyle = 'rgba(7, 193, 96, 0.8)'; // WeChat Green
    ctx.lineWidth = 4;
    ctx.beginPath();

    // Vertical lines
    for (let i = 1; i < cols; i++) {
        const x = i * STICKER_SIZE;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    // Horizontal lines
    for (let i = 1; i < rows; i++) {
        const y = i * STICKER_SIZE;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw Border (仅用于预览)
    ctx.strokeStyle = '#07C160';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

  }, [imageObj, rows, cols, transform, editedImageData, activeTool]);

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算在canvas中的实际坐标（考虑缩放）
    const bounds = canvasRef.current?.getBoundingClientRect();
    const scaleFactor = bounds ? (canvasRef.current!.width / bounds.width) : 1;
    const canvasX = x * scaleFactor;
    const canvasY = y * scaleFactor;
    
    setLastPos({ x: e.clientX, y: e.clientY });

    if (activeTool === 'magic-wand' || activeTool === 'eraser') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas && imageObj) {
        // 确保当前画布有内容
        if (!editedImageData) {
          // 先绘制当前状态到画布（使用透明背景，不绘制网格线）
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // 不填充背景色，保持透明
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.translate(transform.x, transform.y);
          ctx.scale(transform.scale, transform.scale);
          ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
          ctx.restore();
          // 保存初始编辑状态（不包含网格线）
          const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setEditedImageData(initialData);
        }
        
        if (activeTool === 'magic-wand') {
          floodFillTransparency(ctx, Math.floor(canvasX), Math.floor(canvasY));
        } else if (activeTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 20 * scaleFactor, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        
        // 保存编辑后的状态
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setEditedImageData(imageData);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    if (activeTool === 'move') {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      
      // 移动时，如果有编辑状态，需要重置（因为位置变了）
      if (editedImageData) {
        setEditedImageData(null);
      }
      
      const bounds = canvasRef.current?.getBoundingClientRect();
      const scaleFactor = bounds ? (canvasRef.current!.width / bounds.width) : 1;

      setTransform(prev => ({
          ...prev,
          x: prev.x + (dx * scaleFactor),
          y: prev.y + (dy * scaleFactor)
      }));
    } else if (activeTool === 'eraser') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const bounds = canvasRef.current?.getBoundingClientRect();
      const scaleFactor = bounds ? (canvasRef.current!.width / bounds.width) : 1;
      const canvasX = x * scaleFactor;
      const canvasY = y * scaleFactor;
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas && imageObj) {
        // 确保有编辑状态
        if (!editedImageData) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // 不填充背景色，保持透明
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.translate(transform.x, transform.y);
          ctx.scale(transform.scale, transform.scale);
          ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
          ctx.restore();
          const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setEditedImageData(initialData);
        }
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 20 * scaleFactor, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setEditedImageData(imageData);
      }
    }
    
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleProcess = () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    try {
        // 创建一个不包含网格线的画布用于切片
        const canvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) return;
        
        // 如果已经有编辑数据，直接使用（不包含网格线）
        if (editedImageData) {
          tempCtx.putImageData(editedImageData, 0, 0);
        } else if (imageObj) {
          // 否则绘制图片（不包含网格线）
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          const centerX = tempCanvas.width / 2;
          const centerY = tempCanvas.height / 2;
          tempCtx.save();
          tempCtx.translate(centerX, centerY);
          tempCtx.translate(transform.x, transform.y);
          tempCtx.scale(transform.scale, transform.scale);
          tempCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
          tempCtx.restore();
        }
        
        // 从临时画布切片（不包含网格线）
        const slices = sliceCanvas(tempCanvas, rows, cols);
        onImport(slices);
        onClose();
    } catch (e) {
        console.error(e);
        alert("Error processing");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Grid3X3 className="text-wechat-green" />
                    Grid Import & Crop
                </h3>
                <p className="text-xs text-gray-500">Pan and zoom to position your image within the grid.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Main Preview Area */}
            <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center p-8">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(#999 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                }}></div>

                {imageObj ? (
                    <div className="relative shadow-2xl bg-white" style={{ maxHeight: '100%', maxWidth: '100%', aspectRatio: `${cols}/${rows}` }}>
                         <canvas 
                            ref={canvasRef}
                            className={`w-full h-full object-contain touch-none ${
                                activeTool === 'move' ? 'cursor-move' : 'cursor-crosshair'
                            }`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                         />
                         {/* Numbers Overlay for context */}
                         <div className="absolute inset-0 pointer-events-none flex flex-col">
                             {Array.from({ length: rows }).map((_, r) => (
                                 <div key={r} className="flex-1 flex">
                                     {Array.from({ length: cols }).map((_, c) => (
                                         <div key={c} className="flex-1 flex items-center justify-center">
                                            <span className="bg-black/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                                                {(r * cols) + c + 1}
                                            </span>
                                         </div>
                                     ))}
                                 </div>
                             ))}
                         </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400">
                        <Upload size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Upload an image to start</p>
                    </div>
                )}
            </div>

            {/* Sidebar Controls */}
            <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto">
                
                {/* File Upload */}
                <div className="relative group">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg border border-gray-200 flex items-center justify-center gap-2 transition-colors">
                        <Upload size={18} />
                        {imageObj ? "Change Image" : "Upload Image"}
                    </button>
                </div>

                {imageObj && (
                    <>
                        {/* Edit Tools */}
                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Edit Tools</h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTool('move')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        activeTool === 'move' 
                                            ? 'bg-wechat-green text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Move size={16} />
                                    Move
                                </button>
                                <button
                                    onClick={() => setActiveTool('magic-wand')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        activeTool === 'magic-wand' 
                                            ? 'bg-wechat-green text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Wand2 size={16} />
                                    Magic Wand
                                </button>
                                <button
                                    onClick={() => setActiveTool('eraser')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                        activeTool === 'eraser' 
                                            ? 'bg-wechat-green text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Eraser size={16} />
                                    Eraser
                                </button>
                            </div>
                            {activeTool === 'magic-wand' && (
                                <p className="text-xs text-gray-500">点击相似颜色区域去除背景</p>
                            )}
                            {activeTool === 'eraser' && (
                                <p className="text-xs text-gray-500">拖拽擦除不需要的部分</p>
                            )}
                            {editedImageData && (
                                <button
                                    onClick={() => {
                                        setEditedImageData(null);
                                        // 重新触发渲染
                                        const canvas = canvasRef.current;
                                        if (canvas && imageObj) {
                                            const ctx = canvas.getContext('2d');
                                            if (ctx) {
                                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                                ctx.fillStyle = '#f0f0f0';
                                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                const centerX = canvas.width / 2;
                                                const centerY = canvas.height / 2;
                                                ctx.save();
                                                ctx.translate(centerX, centerY);
                                                ctx.translate(transform.x, transform.y);
                                                ctx.scale(transform.scale, transform.scale);
                                                ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
                                                ctx.restore();
                                            }
                                        }
                                    }}
                                    className="w-full py-2 px-3 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                                >
                                    重置编辑
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Grid Layout</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Rows</label>
                                    <input 
                                        type="number" min="1" max="5" 
                                        value={rows} 
                                        onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full border rounded-md p-2 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Columns</label>
                                    <input 
                                        type="number" min="1" max="5" 
                                        value={cols} 
                                        onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full border rounded-md p-2 text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                             <div className="flex justify-between items-center">
                                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Transform</h4>
                                <button 
                                    onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <RotateCcw size={12} /> Reset
                                </button>
                             </div>
                             
                             <div className="space-y-1">
                                <label className="flex justify-between text-xs text-gray-500">
                                    <span>Zoom</span>
                                    <span>{Math.round(transform.scale * 100)}%</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <ZoomOut size={16} className="text-gray-400" />
                                    <input 
                                        type="range" 
                                        min="0.1" max="3" step="0.1"
                                        value={transform.scale}
                                        onChange={e => setTransform({...transform, scale: parseFloat(e.target.value)})}
                                        className="flex-1 accent-wechat-green h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <ZoomIn size={16} className="text-gray-400" />
                                </div>
                             </div>
                             
                             <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex gap-2 items-start">
                                <Move size={14} className="mt-0.5 shrink-0" />
                                <span>Drag the image in the preview area to position it perfectly within the grid cells.</span>
                             </div>
                        </div>

                        <div className="mt-auto pt-6">
                            <button 
                                onClick={handleProcess}
                                disabled={isProcessing}
                                className="w-full bg-wechat-green hover:bg-wechat-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-100 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isProcessing ? "Slicing..." : "Slice & Import"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
