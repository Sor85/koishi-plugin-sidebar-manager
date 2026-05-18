// Koishi Console 前端入口。
// 注册侧栏管理页面和图标样式。
import { Context, Schema, useConfig } from '@koishijs/client'
import { type Ref, watch } from 'vue'
import SidebarManager from './index.vue'
import { initializeActivityLayout, setActivityLayoutDebug } from './activity-layout'
import './icons'
import './index.scss'

interface ClientData {
  debug?: boolean
}

export default function (ctx: Context, data?: Ref<ClientData>) {
  const config = useConfig(true)
  setActivityLayoutDebug(!!data?.value?.debug)
  ctx.effect(() => watch(() => data?.value?.debug, value => setActivityLayoutDebug(!!value)))
  ctx.settings({
    id: '',
    schema: Schema.object({
      activities: Schema.any().hidden(),
    }),
  })
  ctx.effect(() => initializeActivityLayout(ctx, config))

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
