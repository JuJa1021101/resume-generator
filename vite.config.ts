import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
// import { getCDNConfig } from './config/cdn.config'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), '');
  // const cdnConfig = getCDNConfig();

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /^\/api\//],
          offlineGoogleAnalytics: true,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            // OpenAI API缓存
            {
              urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'openai-api-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                networkTimeoutSeconds: 10
              }
            },
            // Hugging Face模型缓存
            {
              urlPattern: /^https:\/\/huggingface\.co\/.*\/resolve\/main\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ai-models-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              }
            },
            // 静态资源缓存
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            // 字体缓存
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
          ]
        },
        manifest: {
          name: 'AI简历生成器',
          short_name: 'AI简历',
          description: '基于AI的智能简历生成工具，根据岗位JD生成匹配简历',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          categories: ['productivity', 'business', 'utilities'],
          shortcuts: [
            {
              name: '新建简历',
              short_name: '新建',
              description: '创建新的简历分析',
              url: '/',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
            },
            {
              name: '历史记录',
              short_name: '历史',
              description: '查看分析历史',
              url: '/history',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
            }
          ]
        },
        devOptions: {
          enabled: false, // 在开发环境中禁用PWA以避免错误
          type: 'module'
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/stores': path.resolve(__dirname, './src/stores'),
        '@/workers': path.resolve(__dirname, './src/workers')
      }
    },
    build: {
      rollupOptions: {
        output: {
          // 优化代码分割策略
          manualChunks: (id) => {
            // 第三方库分组
            if (id.includes('node_modules')) {
              // React 核心库
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // 路由库
              if (id.includes('react-router')) {
                return 'router';
              }
              // UI 组件库
              if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('framer-motion')) {
                return 'ui-vendor';
              }
              // 图表库
              if (id.includes('d3') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'charts-vendor';
              }
              // AI 相关库
              if (id.includes('@xenova/transformers')) {
                return 'transformers-vendor';
              }
              if (id.includes('openai')) {
                return 'openai-vendor';
              }
              // PDF 生成库
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-vendor';
              }
              // 工具库
              if (id.includes('zustand') || id.includes('idb') || id.includes('clsx')) {
                return 'utils-vendor';
              }
              // 其他第三方库
              return 'vendor';
            }

            // 应用代码分组
            if (id.includes('/src/workers/')) {
              return 'workers';
            }
            if (id.includes('/src/services/')) {
              return 'services';
            }
            if (id.includes('/src/components/charts/')) {
              return 'charts-components';
            }
            if (id.includes('/src/components/')) {
              return 'components';
            }
          },
          // 文件命名策略
          chunkFileNames: () => {
            return `assets/js/[name]-[hash].js`;
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
              return `assets/media/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[ext]/[name]-[hash].${ext}`;
          }
        },
        // 外部依赖优化
        external: () => {
          // 对于大型AI模型，考虑外部化处理
          return false;
        }
      },
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除console
          drop_debugger: true, // 移除debugger
          pure_funcs: ['console.log', 'console.info', 'console.debug'], // 移除特定函数调用
          passes: 2 // 多次压缩优化
        },
        mangle: {
          safari10: true // Safari 10兼容性
        },
        format: {
          comments: false // 移除注释
        }
      },
      // 构建优化
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000, // 1MB chunk警告
      sourcemap: process.env.NODE_ENV === 'development',
      // 资源内联阈值
      assetsInlineLimit: 4096, // 4KB以下内联
      // CSS代码分割
      cssCodeSplit: true
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'clsx',
        'tailwind-merge',
        'framer-motion',
        '@headlessui/react',
        '@heroicons/react/24/outline'
      ],
      exclude: [
        'workbox-window'
      ],
      force: true
    },
    // Tree Shaking优化
    define: {
      __DEV__: process.env.NODE_ENV === 'development',
      __PROD__: process.env.NODE_ENV === 'production',
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      global: 'globalThis'
    },
    worker: {
      format: 'es'
    },
    // CDN配置 - 暂时禁用
    // experimental: {
    //   renderBuiltUrl(filename, { hostType }) {
    //     if (hostType === 'js' && cdnConfig.enabled) {
    //       return `${cdnConfig.domains.static}/assets/js/${filename}`;
    //     }
    //     if (hostType === 'css' && cdnConfig.enabled) {
    //       return `${cdnConfig.domains.static}/assets/css/${filename}`;
    //     }
    //     return { relative: true };
    //   }
    // },
    // 服务器配置
    server: {
      host: true,
      port: 5173,
      // 开发环境资源压缩
      middlewareMode: false,
      // 预构建优化
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/router/index.tsx',
          './src/pages/HomePage.tsx'
        ]
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
    // 预览服务器配置
    preview: {
      host: true,
      port: 4173,
      strictPort: true
    }
  };
});