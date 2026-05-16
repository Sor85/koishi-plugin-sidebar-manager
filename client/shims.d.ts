// Koishi Console 配置类型扩展。
// 描述活动栏本地覆盖配置的数据结构。
declare module '@koishijs/client' {
  interface Config {
    activities?: Record<string, {
      hidden?: boolean
      parent?: string
      order?: number
      position?: 'top' | 'bottom'
    }>
  }
}

export {}
