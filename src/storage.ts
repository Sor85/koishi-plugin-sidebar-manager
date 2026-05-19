// 侧栏布局服务端存储工具。
// 负责在 Koishi 数据库可用时读写活动栏覆盖配置。
import type { Context } from 'koishi'

type ActivityPosition = 'top' | 'bottom'

export interface ActivityOverride {
  hidden?: boolean
  parent?: string
  order?: number
  position?: ActivityPosition
}

export type ActivityLayout = Record<string, ActivityOverride>

export const SIDEBAR_LAYOUT_ID = 'default'
export const SIDEBAR_LAYOUT_TABLE = 'sidebar_manager_layout' as const

export interface SidebarManagerLayout {
  id: string
  activities: ActivityLayout
  updatedAt: Date
}

declare module 'koishi' {
  interface Tables {
    sidebar_manager_layout: SidebarManagerLayout
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getDatabase(ctx: Context) {
  return (ctx as { database?: Context['database'] }).database
}

function normalizeActivityLayout(value: unknown): ActivityLayout | undefined {
  if (!isRecord(value)) return

  const result: ActivityLayout = {}
  for (const [id, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue

    const override: ActivityOverride = {}
    if (typeof raw.hidden === 'boolean') override.hidden = raw.hidden
    if (typeof raw.parent === 'string') override.parent = raw.parent
    if (typeof raw.order === 'number') override.order = raw.order
    if (raw.position === 'top' || raw.position === 'bottom') override.position = raw.position
    if (Object.keys(override).length) result[id] = override
  }

  return Object.keys(result).length ? result : undefined
}

// 从 Koishi 数据库读取共享侧栏布局。
export async function readActivityLayout(ctx: Context): Promise<ActivityLayout | undefined> {
  const database = getDatabase(ctx)
  if (!database) return

  const [row] = await database.get(SIDEBAR_LAYOUT_TABLE, { id: SIDEBAR_LAYOUT_ID })
  return normalizeActivityLayout(row?.activities)
}

// 将共享侧栏布局保存到 Koishi 数据库。
export async function saveActivityLayout(ctx: Context, activities: unknown): Promise<boolean> {
  const database = getDatabase(ctx)
  if (!database) return false

  const layout = normalizeActivityLayout(activities)
  if (!layout) return clearActivityLayout(ctx)

  await database.upsert(SIDEBAR_LAYOUT_TABLE, [{
    id: SIDEBAR_LAYOUT_ID,
    activities: layout,
    updatedAt: new Date(),
  }])
  return true
}

// 清空 Koishi 数据库中的共享侧栏布局。
export async function clearActivityLayout(ctx: Context): Promise<boolean> {
  const database = getDatabase(ctx)
  if (!database) return false

  await database.remove(SIDEBAR_LAYOUT_TABLE, { id: SIDEBAR_LAYOUT_ID })
  return true
}
