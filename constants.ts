
export const DEFAULT_PHRASES = [
  "你好", "谢谢", "收到", "好的",
  "早安", "晚安", "开心", "再见"
];

export const STICKER_SIZE = 240;
export const THUMB_SIZE = 120;
export const ICON_SIZE = 50;

export const STYLE_PROMPTS = {
  flat: "flat vector art, clean lines, minimal details, cute sticker style",
  '3d': "3D rendered style, clay texture, soft lighting, cute toy style",
  sketch: "hand drawn sketch style, pencil texture, doodle aesthetic"
};

export const FONTS = [
  { name: '默认黑体', value: '"Noto Sans SC", sans-serif', class: 'font-noto' },
  { name: '快乐体', value: '"Zcool KuaiLe", cursive', class: 'font-kuaile' },
  { name: '毛笔书法', value: '"Ma Shan Zheng", cursive', class: 'font-mashan' },
  { name: '可爱圆体', value: '"Comic Sans MS", cursive', class: 'font-comic' },
  { name: '手写体', value: '"Kalam", cursive', class: 'font-kalam' },
  { name: '创意体', value: '"Fredoka One", cursive', class: 'font-fredoka' },
  { name: '粗体', value: '"Bungee", cursive', class: 'font-bungee' },
  { name: '优雅体', value: '"Dancing Script", cursive', class: 'font-dancing' },
  { name: '科技体', value: '"Orbitron", sans-serif', class: 'font-orbitron' },
  { name: 'Arial', value: 'Arial, sans-serif', class: 'font-sans' },
];

// 动效类型选项
export const ANIMATION_TYPES = [
  { id: 'none', name: '无动效', icon: '🚫' },
  { id: 'swing', name: '摇摆', icon: '↔️' },
  { id: 'bounce', name: '弹跳', icon: '⬆️' },
  { id: 'rotate', name: '旋转', icon: '🔄' },
  { id: 'scale', name: '缩放', icon: '🔍' },
  { id: 'shake', name: '抖动', icon: '📳' },
  { id: 'pulse', name: '脉冲', icon: '💓' },
];

// AI 提供商配置
export const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google 的 AI 模型，支持图像和文本生成',
    models: [
      { 
        id: 'gemini-3-pro-image-preview', 
        name: 'Gemini 3 Pro (图像生成)', 
        description: '最新版本，支持高质量图像生成',
        imageModel: 'gemini-3-pro-image-preview',
        textModel: 'gemini-2.5-flash'
      },
      { 
        id: 'gemini-2.0-flash-exp', 
        name: 'Gemini 2.0 Flash (实验版)', 
        description: '快速响应，适合快速生成',
        imageModel: 'gemini-2.0-flash-exp',
        textModel: 'gemini-2.0-flash-exp'
      },
      { 
        id: 'gemini-1.5-pro', 
        name: 'Gemini 1.5 Pro', 
        description: '稳定版本，高质量输出',
        imageModel: 'gemini-1.5-pro',
        textModel: 'gemini-1.5-pro'
      },
      { 
        id: 'gemini-1.5-flash', 
        name: 'Gemini 1.5 Flash', 
        description: '快速版本，性价比高',
        imageModel: 'gemini-1.5-flash',
        textModel: 'gemini-1.5-flash'
      },
    ]
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    description: '阿里巴巴的 AI 模型，支持图像和文本生成',
    models: [
      {
        id: 'qwen-wan2.5-i2v-preview',
        name: '通义万相 2.5 (图像生成)',
        description: '高质量图像生成模型',
        imageModel: 'wan2.5-i2v-preview',
        textModel: 'qwen-turbo'
      },
      {
        id: 'qwen-turbo',
        name: '通义千问 Turbo',
        description: '快速文本生成模型',
        imageModel: 'wan2.5-i2v-preview',
        textModel: 'qwen-turbo'
      },
      {
        id: 'qwen-plus',
        name: '通义千问 Plus',
        description: '增强版文本生成模型',
        imageModel: 'wan2.5-i2v-preview',
        textModel: 'qwen-plus'
      },
    ]
  },
  {
    id: 'doubao',
    name: '豆包 (Doubao)',
    description: '字节跳动的 AI 模型，支持图像和文本生成',
    models: [
      {
        id: 'doubao-image-v1',
        name: '豆包图像生成',
        description: '高质量图像生成模型',
        imageModel: 'doubao-image-v1',
        textModel: 'doubao-pro-32k'
      },
      {
        id: 'doubao-pro-32k',
        name: '豆包 Pro 32K',
        description: '增强版文本生成模型',
        imageModel: 'doubao-image-v1',
        textModel: 'doubao-pro-32k'
      },
    ]
  }
];

// 兼容旧版本的 AI_MODELS（向后兼容）
export const AI_MODELS = AI_PROVIDERS.flatMap(provider => 
  provider.models.map(model => ({
    ...model,
    provider: provider.id
  }))
);

export const TRANSLATIONS = {
  zh: {
    title: "微信表情包制作",
    modeGrid: "切图制作",
    modeAI: "AI 生成",
    settings: "设置",
    lang: "语言",
    download: "打包下载",
    importGrid: "导入切图",
    genAll: "生成全部",
    charDesc: "人物描述",
    style: "艺术风格",
    statusList: "表情文案",
    addSticker: "添加表情",
    remove: "删除",
    placeholderDesc: "例如：一只吃竹子的可爱熊猫...",
    styleFlat: "扁平",
    style3d: "3D立体",
    styleSketch: "手绘",
    toolMove: "移动/缩放",
    toolWand: "魔棒抠图",
    toolEraser: "橡皮擦",
    toolText: "文字",
    save: "保存修改",
    processing: "处理中...",
    empty: "空",
    failed: "失败",
    retry: "重试",
    packName: "表情包名称 (5字内)",
    packDesc: "介绍 (80字内)",
    dragPan: "拖拽移动 • 滚动缩放",
    clickColor: "点击颜色去除背景",
    dragErase: "拖拽擦除",
    dragText: "拖拽文字",
    fill: "填充",
    stroke: "描边",
    size: "大小",
    font: "字体",
    vertical: "竖排",
    rows: "行数",
    cols: "列数",
    sliceImport: "切割并导入",
    reset: "重置",
    zoom: "缩放",
    selectModel: "选择模型",
    modelDesc: "模型说明",
    currentModel: "当前模型",
    animation: "动效",
    animationType: "动效类型",
    animationSpeed: "速度",
    animationIntensity: "强度",
    enableAnimation: "启用动效",
    exportGif: "导出GIF",
    exportPng: "导出PNG",
    generatingGif: "生成GIF中..."
  },
  en: {
    title: "WeMoji Maker",
    modeGrid: "Grid Slice",
    modeAI: "AI Gen",
    settings: "Settings",
    lang: "Language",
    download: "Download ZIP",
    importGrid: "Import Grid",
    genAll: "Generate All",
    charDesc: "Character",
    style: "Style",
    statusList: "Status/Text",
    addSticker: "Add Sticker",
    remove: "Remove",
    placeholderDesc: "E.g., A cute panda eating bamboo...",
    styleFlat: "Flat",
    style3d: "3D",
    styleSketch: "Sketch",
    toolMove: "Move/Zoom",
    toolWand: "Magic Wand",
    toolEraser: "Eraser",
    toolText: "Text",
    save: "Save Changes",
    processing: "Processing...",
    empty: "Empty",
    failed: "Failed",
    retry: "Retry",
    packName: "Pack Name (Max 5)",
    packDesc: "Description (Max 80)",
    dragPan: "Drag to Pan • Scroll to Zoom",
    clickColor: "Click to remove color",
    dragErase: "Drag to erase",
    dragText: "Drag to move text",
    fill: "Fill",
    stroke: "Stroke",
    size: "Size",
    font: "Font",
    vertical: "Vertical",
    rows: "Rows",
    cols: "Cols",
    sliceImport: "Slice & Import",
    reset: "Reset",
    zoom: "Zoom",
    selectModel: "Select Model",
    modelDesc: "Model Description",
    currentModel: "Current Model",
    animation: "Animation",
    animationType: "Animation Type",
    animationSpeed: "Speed",
    animationIntensity: "Intensity",
    enableAnimation: "Enable Animation",
    exportGif: "Export GIF",
    exportPng: "Export PNG",
    generatingGif: "Generating GIF..."
  }
};
