// 侧栏活动布局持久化工具。
// 将当前 Koishi Console 活动栏顺序固化到本地配置。
import type { Config, Context } from '@koishijs/client'
import { type Ref, watch } from 'vue'

type ActivityPosition = 'top' | 'bottom'
type ActivityOverride = NonNullable<Config['activities']>[string]

const ACTIVITY_LAYOUT_STORAGE_KEY = 'koishi.sidebar-manager.activities'

function hasOverrides(config: Config) {
  return !!config.activities && !!Object.keys(config.activities).length
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function loadActivityLayoutBackup(): NonNullable<Config['activities']> | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_LAYOUT_STORAGE_KEY) ?? 'null')
    if (!isRecord(raw)) return

    const result: NonNullable<Config['activities']> = {}
    for (const [id, value] of Object.entries(raw)) {
      if (!isRecord(value)) continue
      const override: ActivityOverride = {}
      if (typeof value.hidden === 'boolean') override.hidden = value.hidden
      if (typeof value.parent === 'string') override.parent = value.parent
      if (typeof value.order === 'number') override.order = value.order
      if (value.position === 'top' || value.position === 'bottom') override.position = value.position
      if (Object.keys(override).length) result[id] = override
    }

    return Object.keys(result).length ? result : undefined
  } catch {
    return
  }
}

function backupActivityLayout(config: Config) {
  if (!hasOverrides(config)) return
  try {
    localStorage.setItem(ACTIVITY_LAYOUT_STORAGE_KEY, JSON.stringify(config.activities))
  } catch {}
}

// 清除侧栏管理插件自己的活动栏布局备份。
export function clearActivityLayoutBackup() {
  try {
    localStorage.removeItem(ACTIVITY_LAYOUT_STORAGE_KEY)
  } catch {}
}

// 从侧栏管理插件自己的备份中恢复活动栏布局。
export function restoreActivityLayout(config: Config) {
  if (hasOverrides(config)) {
    backupActivityLayout(config)
    return
  }

  const backup = loadActivityLayoutBackup()
  if (backup) config.activities = backup
}

function getOverride(config: Config, id: string): ActivityOverride {
  return (config.activities ??= {})[id] ??= {}
}

function getOrder(ctx: Context, config: Config, id: string) {
  return config.activities?.[id]?.order ?? ctx.$router.pages[id]?.options.order ?? 0
}

function getPosition(ctx: Context, config: Config, id: string): ActivityPosition {
  return config.activities?.[id]?.position ?? ctx.$router.pages[id]?.options.position ?? 'top'
}

// 固化当前已注册活动项的顺序和位置，避免重载后回退到插件默认值。
export function persistCurrentLayout(ctx: Context, config: Config) {
  restoreActivityLayout(config)
  if (!hasOverrides(config)) return

  const sortedActivities = Object.values(ctx.$router.pages)
    .filter(activity => !activity.disabled())
    .sort((left, right) => getOrder(ctx, config, left.id) - getOrder(ctx, config, right.id))
  const groupedActivities: Record<ActivityPosition, typeof sortedActivities> = {
    top: [],
    bottom: [],
  }

  for (const activity of sortedActivities) {
    groupedActivities[getPosition(ctx, config, activity.id)].push(activity)
  }

  for (const position of ['top', 'bottom'] as const) {
    groupedActivities[position].forEach((activity, index) => {
      const override = getOverride(config, activity.id)
      override.order = (index + 1) * 100
      override.position = position
    })
  }

  backupActivityLayout(config)
}

// 监听活动项注册变化，迁移旧版已经存在的部分自定义配置。
export function watchActivityLayout(ctx: Context, config: Ref<Config>) {
  return watch(
    () => Object.values(ctx.$router.pages)
      .map(activity => [activity.id, activity.order, activity.position].join(':'))
      .sort()
      .join('\n'),
    () => persistCurrentLayout(ctx, config.value),
  )
}
