
import { STICKER_SIZE } from '../constants';

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Flood Fill Algorithm for Magic Wand
export const floodFillTransparency = (
  ctx: CanvasRenderingContext2D, 
  startX: number, 
  startY: number, 
  tolerance: number = 30
) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Get start color
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  if (startA === 0) return; // Already transparent

  const matchColor = (pos: number) => {
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    const a = data[pos + 3];
    return (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance &&
      a !== 0
    );
  };

  const stack = [[startX, startY]];
  const seen = new Uint8Array(width * height); // keep track of visited pixels

  while (stack.length) {
    const pop = stack.pop();
    if (!pop) continue;
    const [x, y] = pop;
    const pos = (y * width + x) * 4;
    const pixelIndex = y * width + x;

    if (seen[pixelIndex]) continue;
    seen[pixelIndex] = 1;

    if (matchColor(pos)) {
      data[pos + 3] = 0; // Set Alpha to 0

      if (x > 0) stack.push([x - 1, y]);
      if (x < width - 1) stack.push([x + 1, y]);
      if (y > 0) stack.push([x, y - 1]);
      if (y < height - 1) stack.push([x, y + 1]);
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

// Generates Icon (50x50) or Thumbnail (120x120) without text
export const generateThumbnail = async (imgSrc: string, size: number): Promise<string> => {
  const img = await loadImage(imgSrc);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas failed");

  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL('image/png');
};

// Slice directly from a manipulated Canvas (Crop/Scale result)
export const sliceCanvas = (
  sourceCanvas: HTMLCanvasElement,
  rows: number,
  cols: number
): string[] => {
  const images: string[] = [];
  const cellW = sourceCanvas.width / cols;
  const cellH = sourceCanvas.height / rows;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = STICKER_SIZE;
  tempCanvas.height = STICKER_SIZE;
  const ctx = tempCanvas.getContext('2d');
  
  if (!ctx) return [];

  const count = rows * cols;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE);
    
    // Draw from the high-res source canvas into the standard sticker size canvas
    ctx.drawImage(
      sourceCanvas,
      col * cellW, row * cellH, cellW, cellH, // Source Rect
      0, 0, STICKER_SIZE, STICKER_SIZE        // Dest Rect (240x240)
    );

    images.push(tempCanvas.toDataURL('image/png'));
  }
  return images;
};

// Helper for Vertical Text
export const drawText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    config: {
        color: string,
        stroke: string,
        fontSize: number,
        fontFamily: string,
        orientation: 'horizontal' | 'vertical'
    }
) => {
    ctx.font = `900 ${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, config.fontSize / 6);
    ctx.strokeStyle = config.stroke;
    ctx.fillStyle = config.color;

    if (config.orientation === 'vertical') {
        const lineHeight = config.fontSize * 1.1;
        // Center the column vertically around Y
        const totalHeight = text.length * lineHeight;
        let startY = y - (totalHeight / 2) + (lineHeight / 2);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            ctx.strokeText(char, x, startY);
            ctx.fillText(char, x, startY);
            startY += lineHeight;
        }
    } else {
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
    }
}

export const processFinalSticker = async (
    imgUrl: string, 
    removeBg: boolean = false
): Promise<string> => {
    const img = await loadImage(imgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = STICKER_SIZE;
    canvas.height = STICKER_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas failed");
    
    ctx.drawImage(img, 0, 0, STICKER_SIZE, STICKER_SIZE);

    if (removeBg) {
        const imageData = ctx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
        const data = imageData.data;
        const threshold = 245;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
    return canvas.toDataURL('image/png');
}
