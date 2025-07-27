/**
 * CDN配置文件
 * 用于配置静态资源CDN加速
 */

export interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  domains: {
    static: string;
    images: string;
    fonts: string;
    models: string;
  };
  regions: {
    default: string;
    fallback: string[];
  };
}

// 生产环境CDN配置
export const productionCDN: CDNConfig = {
  enabled: true,
  baseUrl: 'https://cdn.ai-resume.com',
  domains: {
    static: 'https://static.ai-resume.com',
    images: 'https://images.ai-resume.com',
    fonts: 'https://fonts.ai-resume.com',
    models: 'https://models.ai-resume.com'
  },
  regions: {
    default: 'us-east-1',
    fallback: ['us-west-2', 'eu-west-1', 'ap-southeast-1']
  }
};

// 开发环境配置
export const developmentCDN: CDNConfig = {
  enabled: false,
  baseUrl: 'http://localhost:5173',
  domains: {
    static: 'http://localhost:5173',
    images: 'http://localhost:5173',
    fonts: 'http://localhost:5173',
    models: 'http://localhost:5173'
  },
  regions: {
    default: 'local',
    fallback: []
  }
};

// 获取当前环境CDN配置
export const getCDNConfig = (): CDNConfig => {
  return process.env.NODE_ENV === 'production' ? productionCDN : developmentCDN;
};

// CDN资源URL生成器
export const generateCDNUrl = (path: string, type: 'static' | 'images' | 'fonts' | 'models' = 'static'): string => {
  const config = getCDNConfig();

  if (!config.enabled) {
    return path;
  }

  const domain = config.domains[type];
  return `${domain}${path.startsWith('/') ? '' : '/'}${path}`;
};

// 预加载关键资源
export const preloadResources = [
  // 关键CSS
  { href: '/assets/css/critical.css', as: 'style' },
  // 关键字体
  { href: '/assets/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
  // 关键图片
  { href: '/assets/images/logo.webp', as: 'image' }
];

// 资源提示配置
export const resourceHints = {
  // DNS预解析
  dnsPrefetch: [
    'https://api.openai.com',
    'https://huggingface.co',
    'https://fonts.googleapis.com'
  ],
  // 预连接
  preconnect: [
    'https://api.openai.com',
    'https://fonts.gstatic.com'
  ],
  // 预取资源
  prefetch: [
    '/assets/js/charts-vendor.js',
    '/assets/js/pdf-vendor.js'
  ]
};