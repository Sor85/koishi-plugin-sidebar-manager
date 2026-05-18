// Koishi 服务端入口。
// 在控制台服务可用时注册侧栏管理前端资源。
import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/console'

export const name = 'sidebar-manager'

export interface Config {
  debug?: boolean
}

// 声明插件配置项，支持打开前端布局调试日志。
export const Config: Schema<Config> = Schema.object({
  debug: Schema.boolean().default(false).description('输出调试日志'),
})

// 注册 Koishi Console 前端入口。
export function apply(ctx: Context, config: Config) {
  ctx.inject(['console'], (inner) => {
    inner.console.addEntry(process.env.KOISHI_BASE ? [
      process.env.KOISHI_BASE + '/dist/index.js',
      process.env.KOISHI_BASE + '/dist/style.css',
    ] : {
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    }, () => ({ debug: !!config.debug }))
  })
}
