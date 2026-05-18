// 侧栏活动布局持久化工具。
// 将当前 Koishi Console 活动栏顺序固化到本地配置。
import type { Config, Context } from '@koishijs/client'
import type { Ref } from 'vue'

type ActivityPosition = 'top' | 'bottom'
type ActivityOverride = NonNullable<Config['activities']>[string]

const ACTIVITY_LAYOUT_STORAGE_KEY = 'koishi.sidebar-manager.activities'
let debugEnabled = false

function snapshotActivities(ctx: Context, config: Config) {
  return Object.values(ctx.$router.pages).map(activity => ({
    id: activity.id,
    disabled: !!activity.disabled(),
    order: activity.order,
    position: activity.position,
    optionsOrder: activity.options.order,
    optionsPosition: activity.options.position,
    override: config.activities?.[activity.id],
  }))
}

function debugLog(ctx: Context | undefined, config: Config | undefined, message: string, extra?: unknown) {
  if (!debugEnabled) return
  const payload = ctx && config ? {
    activities: snapshotActivities(ctx, config),
    configActivities: config.activities,
    extra,
  } : extra
  console.debug(`[sidebar-manager] ${message}`, payload)
}

// 设置侧栏布局调试日志开关。
export function setActivityLayoutDebug(value: boolean) {
  debugEnabled = value
  debugLog(undefined, undefined, `debug ${value ? 'enabled' : 'disabled'}`)
}

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
    debugLog(undefined, undefined, 'backup activity layout', config.activities)
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
    debugLog(undefined, undefined, 'keep existing activity layout', config.activities)
    return
  }

  const backup = loadActivityLayoutBackup()
  if (backup) {
    config.activities = backup
    debugLog(undefined, undefined, 'restore activity layout backup', backup)
  }
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

function compareActivities(ctx: Context, config: Config, left: string, right: string) {
  return getOrder(ctx, config, left) - getOrder(ctx, config, right) || left.localeCompare(right)
}

// 固化当前已注册活动项的顺序和位置，避免重载后回退到插件默认值。
export function persistCurrentLayout(ctx: Context, config: Config) {
  debugLog(ctx, config, 'persist layout start')
  restoreActivityLayout(config)
  if (!hasOverrides(config)) {
    debugLog(ctx, config, 'skip persist without overrides')
    return
  }

  const sortedActivities = Object.values(ctx.$router.pages)
    .filter(activity => !activity.disabled())
    .sort((left, right) => compareActivities(ctx, config, left.id, right.id))
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
  debugLog(ctx, config, 'persist layout finish')
}

// 初始化侧栏活动布局，只恢复备份，不因启动过程中的活动项变化重写顺序。
export function initializeActivityLayout(ctx: Context, config: Ref<Config>) {
  let disposed = false

  ctx.$loader.initTask.then(() => {
    if (disposed) return
    restoreActivityLayout(config.value)
    debugLog(ctx, config.value, 'initialize activity layout')
  })

  return () => {
    disposed = true
  }
}
