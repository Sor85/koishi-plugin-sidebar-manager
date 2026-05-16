// Koishi Console 前端入口。
// 注册侧栏管理页面和图标样式。
import { Context } from '@koishijs/client'
import SidebarManager from './index.vue'
import './icons'
import './index.scss'

export default function (ctx: Context) {
  ctx.page({
    id: 'sidebar-manager',
    path: '/sidebar-manager',
    name: '侧栏管理',
    icon: 'activity:sidebar-manager',
    order: 900,
    authority: 4,
    component: SidebarManager,
  })
}
