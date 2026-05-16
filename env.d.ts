// Vite/Vue 类型声明。
// 允许 TypeScript 识别单文件组件导入。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
