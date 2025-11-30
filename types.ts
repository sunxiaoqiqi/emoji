
export interface Sticker {
  id: string;
  url: string; // The current display URL (processed)
  originalUrl?: string; // The raw source for re-editing/panning
  text: string;
  textConfig?: {
    x: number;
    y: number;
    color: string;
    stroke: string;
    fontSize: number;
    fontFamily: string;
    orientation: 'horizontal' | 'vertical';
  };
  animationConfig?: {
    type: AnimationType;
    enabled: boolean;
    speed: number; // 1-10, 10最快
    intensity: number; // 1-10, 10最强
  };
  selections?: Selection[]; // 多个选区，每个选区可以有自己的动效
  isEdited: boolean;
  status: 'empty' | 'loading' | 'generated' | 'error';
}

export type AnimationType = 'none' | 'swing' | 'bounce' | 'rotate' | 'scale' | 'shake' | 'pulse';

export interface PackMetadata {
  name: string;
  description: string;
  author: string;
}

export interface GenerationConfig {
  characterDesc: string;
  style: 'flat' | '3d' | 'sketch';
  mode: 'static' | 'dynamic';
}

export type ProcessingStatus = 'idle' | 'generating_images' | 'generating_meta' | 'zipping' | 'done' | 'error';

export type ToolType = 'move' | 'eraser' | 'magic-wand' | 'text' | 'select';

// 选区类型
export interface Selection {
  id: string;
  type: 'rect'; // 目前只支持矩形，后续可扩展
  x: number;
  y: number;
  width: number;
  height: number;
  mask?: ImageData; // 选区遮罩
  animationConfig?: {
    type: AnimationType;
    enabled: boolean;
    speed: number;
    intensity: number;
  };
}

export type Language = 'zh' | 'en';
export type AppMode = 'grid' | 'ai';
