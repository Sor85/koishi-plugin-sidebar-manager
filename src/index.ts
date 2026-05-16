// Koishi 服务端入口。
// 在控制台服务可用时注册侧栏管理前端资源。
import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/console'

export const name = 'sidebar-manager'

export interface Config {}

// 声明空配置项，避免控制台将插件识别为未声明配置。
export const Config: Schema<Config> = Schema.object({})

// 注册 Koishi Console 前端入口。
export function apply(ctx: Context) {
  ctx.inject(['console'], (inner) => {
    inner.console.addEntry(process.env.KOISHI_BASE ? [
      process.env.KOISHI_BASE + '/dist/index.js',
      process.env.KOISHI_BASE + '/dist/style.css',
    ] : {
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}
