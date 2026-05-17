// Koishi Console 前端入口。
// 注册侧栏管理页面和图标样式。
import { Context, Schema, useConfig } from '@koishijs/client'
import SidebarManager from './index.vue'
import { persistCurrentLayout, watchActivityLayout } from './activity-layout'
import './icons'
import './index.scss'

export default function (ctx: Context) {
  const config = useConfig(true)
  ctx.settings({
    id: '',
    schema: Schema.object({
      activities: Schema.any().hidden(),
    }),
  })
  ctx.effect(() => watchActivityLayout(ctx, config))
  ctx.$loader.initTask.then(() => persistCurrentLayout(ctx, config.value))

  ctx.page({
    id: 'sidebar-manager',
    path: '/sidebar-manager',
    name: '侧栏管理',
    icon: 'activity:sidebar-manager',
    order: 100,
    position: 'bottom',
    authority: 4,
    component: SidebarManager,
  })
}
