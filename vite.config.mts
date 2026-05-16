// 前端构建配置。
// 将 Koishi Console 扩展打包到 dist 目录。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  build: {
    lib: {
      entry: 'client/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        '@vueuse/core',
        '@koishijs/client',
      ],
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        assetFileNames: 'style.css',
      },
    },
  },
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  resolve: {
    alias: {
      'vue-i18n': '@koishijs/client',
      '@koishijs/components': '@koishijs/client',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
