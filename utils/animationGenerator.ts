import { AnimationType } from '../types';
import { STICKER_SIZE } from '../constants';
import { loadImage, drawText } from './imageProcessor';

// 生成动画帧
export const generateAnimationFrames = async (
  imageUrl: string,
  textConfig: any,
  text: string,
  animationType: AnimationType,
  frames: number = 12,
  speed: number = 5,
  intensity: number = 5,
  selections?: Array<{ mask: ImageData; animationConfig: { type: AnimationType; speed: number; intensity: number } }>
): Promise<ImageData[]> => {
  const img = await loadImage(imageUrl);
  const framesData: ImageData[] = [];
  
  // 降低分辨率以提升速度
  const optimizedSize = 200; // 从240降到200，速度提升约30%
  
  // 速度系数：speed越大，动画越快（帧间隔越小）
  const speedFactor = 1 / (speed * 0.1 + 0.5);
  // 强度系数：intensity越大，动画幅度越大
  const intensityFactor = intensity / 10;
  
  for (let i = 0; i < frames; i++) {
    const progress = (i / frames) * Math.PI * 2; // 0 到 2π
    const canvas = document.createElement('canvas');
    canvas.width = optimizedSize;
    canvas.height = optimizedSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    // 清空画布（透明背景）
    ctx.clearRect(0, 0, optimizedSize, optimizedSize);
    
    // 计算变换
    let translateX = 0;
    let translateY = 0;
    let rotate = 0;
    let scale = 1;
    
    switch (animationType) {
      case 'swing':
        // 左右摇摆
        translateX = Math.sin(progress * speedFactor) * 10 * intensityFactor;
        break;
      case 'bounce':
        // 上下弹跳
        translateY = -Math.abs(Math.sin(progress * speedFactor)) * 15 * intensityFactor;
        break;
      case 'rotate':
        // 旋转
        rotate = progress * speedFactor * intensityFactor;
        break;
      case 'scale':
        // 缩放
        scale = 1 + Math.sin(progress * speedFactor) * 0.2 * intensityFactor;
        break;
      case 'shake':
        // 抖动（随机方向）
        translateX = (Math.random() - 0.5) * 8 * intensityFactor;
        translateY = (Math.random() - 0.5) * 8 * intensityFactor;
        break;
      case 'pulse':
        // 脉冲（缩放+透明度）
        scale = 1 + Math.sin(progress * speedFactor * 2) * 0.15 * intensityFactor;
        break;
    }
    
    // 如果有多个选区，分别处理每个选区
    if (selections && selections.length > 0) {
      // 先绘制静态背景（未选中区域）
      const staticCanvas = document.createElement('canvas');
      staticCanvas.width = optimizedSize;
      staticCanvas.height = optimizedSize;
      const staticCtx = staticCanvas.getContext('2d');
      if (staticCtx) {
        staticCtx.drawImage(img, 0, 0, optimizedSize, optimizedSize);
        
        // 应用所有选区的反向遮罩（未选中区域保留）
        const staticData = staticCtx.getImageData(0, 0, optimizedSize, optimizedSize);
        const scaleRatio = optimizedSize / STICKER_SIZE;
        
        for (const selection of selections) {
          const maskData = selection.mask.data;
          for (let i = 0; i < staticData.data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = (pixelIndex % STICKER_SIZE);
            const y = Math.floor(pixelIndex / STICKER_SIZE);
            const maskX = Math.floor(x * scaleRatio);
            const maskY = Math.floor(y * scaleRatio);
            const maskIndex = (maskY * STICKER_SIZE + maskX) * 4;
            if (maskIndex < maskData.length) {
              const maskAlpha = maskData[maskIndex + 3] / 255;
              staticData.data[i + 3] *= (1 - maskAlpha); // 反向遮罩
            }
          }
        }
        staticCtx.putImageData(staticData, 0, 0);
        ctx.drawImage(staticCanvas, 0, 0);
      }
      
      // 对每个选区应用各自的动效
      for (const selection of selections) {
        if (!selection.animationConfig.enabled || selection.animationConfig.type === 'none') continue;
        
        const selProgress = (i / frames) * Math.PI * 2;
        const selSpeedFactor = 1 / (selection.animationConfig.speed * 0.1 + 0.5);
        const selIntensityFactor = selection.animationConfig.intensity / 10;
        
        let selTranslateX = 0;
        let selTranslateY = 0;
        let selRotate = 0;
        let selScale = 1;
        
        switch (selection.animationConfig.type) {
          case 'swing':
            selTranslateX = Math.sin(selProgress * selSpeedFactor) * 10 * selIntensityFactor;
            break;
          case 'bounce':
            selTranslateY = -Math.abs(Math.sin(selProgress * selSpeedFactor)) * 15 * selIntensityFactor;
            break;
          case 'rotate':
            selRotate = selProgress * selSpeedFactor * selIntensityFactor;
            break;
          case 'scale':
            selScale = 1 + Math.sin(selProgress * selSpeedFactor) * 0.2 * selIntensityFactor;
            break;
          case 'shake':
            selTranslateX = (Math.random() - 0.5) * 8 * selIntensityFactor;
            selTranslateY = (Math.random() - 0.5) * 8 * selIntensityFactor;
            break;
          case 'pulse':
            selScale = 1 + Math.sin(selProgress * selSpeedFactor * 2) * 0.15 * selIntensityFactor;
            break;
        }
        
        // 创建选中区域的临时canvas
        const selectedCanvas = document.createElement('canvas');
        selectedCanvas.width = optimizedSize;
        selectedCanvas.height = optimizedSize;
        const selectedCtx = selectedCanvas.getContext('2d');
        if (selectedCtx) {
          selectedCtx.drawImage(img, 0, 0, optimizedSize, optimizedSize);
          
          // 应用遮罩，只保留选中区域
          const selectedData = selectedCtx.getImageData(0, 0, optimizedSize, optimizedSize);
          const maskData = selection.mask.data;
          const scaleRatio = optimizedSize / STICKER_SIZE;
          
          for (let i = 0; i < selectedData.data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = (pixelIndex % optimizedSize);
            const y = Math.floor(pixelIndex / optimizedSize);
            const maskX = Math.floor(x / scaleRatio);
            const maskY = Math.floor(y / scaleRatio);
            const maskIndex = (maskY * STICKER_SIZE + maskX) * 4;
            if (maskIndex < maskData.length) {
              const maskAlpha = maskData[maskIndex + 3] / 255;
              selectedData.data[i + 3] *= maskAlpha; // 应用遮罩
            }
          }
          selectedCtx.putImageData(selectedData, 0, 0);
          
          // 应用动效变换
          ctx.save();
          ctx.translate(optimizedSize / 2, optimizedSize / 2);
          ctx.rotate(selRotate);
          ctx.scale(selScale, selScale);
          ctx.translate(selTranslateX, selTranslateY);
          ctx.drawImage(selectedCanvas, -optimizedSize / 2, -optimizedSize / 2);
          ctx.restore();
        }
      }
    } else {
      // 没有选区，对整个图片应用动效
      ctx.save();
      ctx.translate(optimizedSize / 2, optimizedSize / 2);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(translateX, translateY);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
    
    // 绘制文字（文字不参与动画，保持稳定）- 只有当文字不为空时才绘制
    if (text && text.trim() && textConfig) {
      // 按比例缩放文字位置和大小
      const scaleRatio = optimizedSize / STICKER_SIZE;
      const scaledTextConfig = {
        ...textConfig,
        x: textConfig.x * scaleRatio,
        y: textConfig.y * scaleRatio,
        fontSize: (textConfig.fontSize || 24) * scaleRatio,
      };
      drawText(ctx, text, scaledTextConfig.x, scaledTextConfig.y, scaledTextConfig);
    }
    
    framesData.push(ctx.getImageData(0, 0, optimizedSize, optimizedSize));
  }
  
  return framesData;
};

// 使用 gif.js 生成 GIF
export const generateGif = async (
  frames: ImageData[],
  delay: number = 100
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    // @ts-ignore - gif.js 是全局变量
    let GIF = (window as any).GIF;
    
    const initGif = () => {
      if (!GIF) {
        reject(new Error('GIF.js 未加载'));
        return;
      }
      
      // 使用本地 Worker 文件，启用多线程加速
      // 降低分辨率以进一步提升速度（200x200 仍然足够清晰）
      const optimizedSize = 200; // 从240降到200，速度提升约30%
      
      const gif = new GIF({
        workers: 2, // 使用 2 个 Web Workers 加速（本地文件，无跨域问题）
        workerScript: '/gif.worker.js', // 使用本地 worker 文件
        quality: 5, // 使用 Web Workers 后可以适当提高质量（5 在 200x200 下质量更好）
        width: optimizedSize,
        height: optimizedSize,
        transparent: 'rgba(0,0,0,0)',
        background: '#00000000',
      });
      
      console.log('使用 Web Workers 模式生成 GIF（已优化：质量5，3帧，200x200，2个Worker）');
      
      let lastProgress = -1;
      const totalFrames = frames.length;
      let frameCount = 0;
      
      console.log('开始生成GIF，共', totalFrames, '帧，尺寸:', optimizedSize + 'x' + optimizedSize);
      
      // 添加帧时更新进度（只添加一次，修复重复添加的bug）
      frames.forEach((frame, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = optimizedSize;
        canvas.height = optimizedSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.putImageData(frame, 0, 0);
          gif.addFrame(canvas, { delay });
          frameCount++;
          // 每添加一帧就更新进度
          const progress = Math.round((frameCount / totalFrames) * 50); // 添加帧占50%进度
          if (progress !== lastProgress && progress % 10 === 0) {
            console.log('GIF生成进度:', progress + '% (添加帧中...)');
            lastProgress = progress;
          }
        }
      });
      
      let encodingProgress = 50;
      let progressInterval: number | null = null;
      
      // 编码阶段的进度模拟（Web Workers 模式下 progress 事件更可靠）
      // 使用 Web Workers 后编码更快，进度更新也更快
      progressInterval = window.setInterval(() => {
        encodingProgress = Math.min(95, encodingProgress + 5); // 每200ms增加5%（Web Workers 模式更快）
        if (encodingProgress !== lastProgress && encodingProgress % 10 === 0) {
          console.log('GIF生成进度:', encodingProgress + '% (编码中...Web Workers 加速中)');
          lastProgress = encodingProgress;
        }
      }, 200);
      
      gif.on('finished', (blob: Blob) => {
        isResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        console.log('GIF生成进度: 100%');
        console.log('GIF生成完成！文件大小:', (blob.size / 1024).toFixed(2) + 'KB');
        resolve(blob);
      });
      
      gif.on('progress', (p: number) => {
        // gif.js的progress事件（编码阶段，占50-100%）
        const progress = 50 + Math.round(p * 50); // 编码阶段占后50%
        encodingProgress = progress; // 更新实际进度
        if (progress !== lastProgress && (progress % 10 === 0 || progress === 100)) {
          console.log('GIF生成进度:', progress + '% (编码中...)');
          lastProgress = progress;
        }
      });
      
      gif.on('abort', () => {
        isResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        reject(new Error('GIF生成被中止'));
      });
      
      // 设置真正的超时机制（使用 Web Workers 后，60秒应该足够）
      let timeoutId: number | null = null;
      let isResolved = false;
      
      timeoutId = window.setTimeout(() => {
        if (!isResolved) {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          console.warn('GIF生成超时（60秒），自动回退到PNG格式');
          reject(new Error('GIF生成超时，已自动回退到PNG'));
        }
      }, 60000); // 60秒超时（Web Workers 模式下应该更快）
      
      try {
        console.log('开始编码GIF...');
        gif.render();
      } catch (error) {
        isResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        console.error('GIF渲染错误:', error);
        reject(error);
      }
    };
    
    // 如果已经加载过，直接使用
    if (GIF) {
      initGif();
    } else {
      // 动态加载 gif.js (从本地文件)
      const script = document.createElement('script');
      script.src = '/gif.js';
      script.onload = () => {
        // @ts-ignore - gif.js 是全局变量
        GIF = (window as any).GIF;
        if (!GIF) {
          reject(new Error('GIF.js 加载失败'));
          return;
        }
        initGif();
      };
      script.onerror = () => reject(new Error('GIF.js 脚本加载失败，请确保 /gif.js 文件存在'));
      document.head.appendChild(script);
    }
  });
};

// 从图片URL生成GIF
export const generateGifFromImage = async (
  imageUrl: string,
  textConfig: any,
  text: string,
  animationType: AnimationType,
  speed: number = 5,
  intensity: number = 5,
  selections?: Array<{ mask: ImageData; animationConfig: { type: AnimationType; speed: number; intensity: number } }>
): Promise<Blob> => {
  // 进一步减少帧数以提高生成速度（3帧足够流畅且快速）
  const frames = await generateAnimationFrames(
    imageUrl,
    textConfig,
    text,
    animationType,
    3, // 减少到3帧，最大化生成速度
    speed,
    intensity,
    selections
  );
  
  // 根据速度计算延迟（速度越快，延迟越小）
  // 如果有多个选区，使用最快的速度
  const maxSpeed = selections && selections.length > 0 
    ? Math.max(...selections.map(s => s.animationConfig.speed), speed)
    : speed;
  const delay = Math.max(50, 200 - maxSpeed * 15);
  
  return generateGif(frames, delay);
};

