// Koishi 服务端入口。
// 在控制台服务可用时注册侧栏管理前端资源。
import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/console'
import {
  ActivityLayout,
  clearActivityLayout,
  readActivityLayout,
  saveActivityLayout,
  SIDEBAR_LAYOUT_TABLE,
} from './storage'

export const name = 'sidebar-manager'

// 声明插件可选服务依赖，供 Koishi 前端和运行时识别。
export const inject = {
  optional: ['console', 'database'],
}

export interface Config {
  debug?: boolean
}

declare module '@koishijs/console' {
  interface Events {
    'sidebar-manager/get-layout'(): Promise<ActivityLayout | undefined>
    'sidebar-manager/save-layout'(activities: ActivityLayout): Promise<boolean>
    'sidebar-manager/clear-layout'(): Promise<boolean>
  }
}

// 声明插件配置项，支持打开前端布局调试日志。
export const Config: Schema<Config> = Schema.object({
  debug: Schema.boolean().default(false).description('输出调试日志'),
})

// 注册 Koishi Console 前端入口。
export function apply(ctx: Context, config: Config) {
  ctx.model.extend(SIDEBAR_LAYOUT_TABLE, {
    id: 'string(64)',
    activities: 'object',
    updatedAt: 'timestamp',
  }, {
    primary: 'id',
  })

  ctx.inject({
    console: { required: true },
    database: { required: false },
  }, (inner) => {
    inner.console.addListener('sidebar-manager/get-layout', () => readActivityLayout(inner), { authority: 0 })
    inner.console.addListener('sidebar-manager/save-layout', activities => saveActivityLayout(inner, activities), { authority: 4 })
    inner.console.addListener('sidebar-manager/clear-layout', () => clearActivityLayout(inner), { authority: 4 })
    inner.console.addEntry(process.env.KOISHI_BASE ? [
      process.env.KOISHI_BASE + '/dist/index.js',
      process.env.KOISHI_BASE + '/dist/style.css',
    ] : {
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    }, () => ({ debug: !!config.debug }))
  })
}
