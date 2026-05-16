<!--
  侧栏管理主页面。
  读取并修改 Koishi Console 本地活动栏配置。
-->
<template>
  <k-layout main="page-sidebar-manager">
    <template #header>侧栏管理</template>

    <div class="sidebar-manager">
      <section class="summary">
        <div class="summary-card">
          <div class="summary-value">{{ activities.length }}</div>
          <div class="summary-label">侧栏项目</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">{{ collectedCount }}</div>
          <div class="summary-label">已收纳</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">{{ bottomCount }}</div>
          <div class="summary-label">底部项目</div>
        </div>
      </section>

      <section class="toolbar">
        <input v-model.trim="keyword" class="search" placeholder="搜索名称或 ID" />
        <button class="button danger" @click="resetActivities">重置侧栏</button>
      </section>

      <section v-if="filteredActivities.length" class="activity-list">
        <article v-for="activity in filteredActivities" :key="activity.id" class="activity-row">
          <div class="activity-icon">
            <k-icon :name="activity.icon" />
          </div>

          <div class="activity-main">
            <div class="activity-name">
              {{ activity.name }}
              <span v-if="isCollected(activity.id)" class="badge collected">已收纳</span>
              <span v-else-if="isHidden(activity.id)" class="badge hidden">已隐藏</span>
              <span v-else class="badge">{{ getPosition(activity.id) === 'bottom' ? '底部' : '顶部' }}</span>
              <span v-if="getParent(activity.id) && !isCollected(activity.id)" class="badge">分组：{{ getParentName(activity.id) }}</span>
            </div>
            <div class="activity-id">{{ activity.id }}</div>
            <div v-if="activity.desc" class="activity-desc">{{ activity.desc }}</div>
          </div>

          <div class="activity-actions">
            <button class="button" :disabled="isCollected(activity.id)" @click="moveUp(activity.id)">上移</button>
            <button class="button" :disabled="isCollected(activity.id)" @click="moveDown(activity.id)">下移</button>
            <button class="button" :disabled="isCollected(activity.id)" @click="togglePosition(activity.id)">
              {{ getPosition(activity.id) === 'bottom' ? '移到顶部' : '移到底部' }}
            </button>
            <button class="button" @click="toggleCollected(activity.id)">
              {{ isCollected(activity.id) ? '取消收纳' : '收纳' }}
            </button>
          </div>
        </article>
      </section>

      <div v-else class="empty">没有匹配的侧栏项目。</div>
    </div>
  </k-layout>
</template>

<script lang="ts" setup>

import { useConfig, useContext } from '@koishijs/client'
import { computed, ref } from 'vue'

const SIDEBAR_MANAGER_ID = 'sidebar-manager'

type ActivityPosition = 'top' | 'bottom'

interface ActivityOverride {
  hidden?: boolean
  parent?: string
  order?: number
  position?: ActivityPosition
}

const ctx = useContext()
const config = useConfig(true)
const keyword = ref('')

const overrides = computed<Record<string, ActivityOverride>>({
  get() {
    return config.value.activities ??= {}
  },
  set(value) {
    config.value.activities = value
  },
})

const activities = computed(() => Object.values(ctx.$router.pages)
  .filter(activity => activity.id !== SIDEBAR_MANAGER_ID)
  .sort((left, right) => getOrder(left.id) - getOrder(right.id)))

const filteredActivities = computed(() => {
  const query = keyword.value.toLowerCase()
  if (!query) return activities.value
  return activities.value.filter((activity) => {
    return activity.id.toLowerCase().includes(query)
      || activity.name.toLowerCase().includes(query)
      || activity.desc?.toLowerCase().includes(query)
  })
})

const collectedCount = computed(() => activities.value.filter(activity => isCollected(activity.id)).length)
const bottomCount = computed(() => activities.value.filter(activity => getPosition(activity.id) === 'bottom').length)

function getOverride(id: string) {
  return overrides.value[id] ??= {}
}

function cleanOverride(id: string) {
  if (!Object.keys(overrides.value[id] ?? {}).length) {
    delete overrides.value[id]
  }
}

function getOrder(id: string) {
  return overrides.value[id]?.order ?? ctx.$router.pages[id]?.order ?? 0
}

function getPosition(id: string): ActivityPosition {
  return overrides.value[id]?.position ?? ctx.$router.pages[id]?.position ?? 'top'
}

function getParent(id: string) {
  return overrides.value[id]?.parent
}

function getParentName(id: string) {
  const parent = getParent(id)
  return parent ? ctx.$router.pages[parent]?.name ?? parent : ''
}

function isCollected(id: string) {
  return getParent(id) === SIDEBAR_MANAGER_ID && !isHidden(id)
}

function isHidden(id: string) {
  return !!overrides.value[id]?.hidden
}

function toggleCollected(id: string) {
  const override = getOverride(id)
  if (isCollected(id)) {
    delete override.parent
  } else {
    override.parent = SIDEBAR_MANAGER_ID
    delete override.hidden
  }
  cleanOverride(id)
}

function togglePosition(id: string) {
  const activity = ctx.$router.pages[id]
  const next = getPosition(id) === 'bottom' ? 'top' : 'bottom'
  const override = getOverride(id)
  if (activity.options.position === next) {
    delete override.position
  } else {
    override.position = next
  }
  cleanOverride(id)
}

function moveUp(id: string) {
  moveBy(id, -1)
}

function moveDown(id: string) {
  moveBy(id, 1)
}

function moveBy(id: string, offset: number) {
  const list = activities.value.filter(activity => getPosition(activity.id) === getPosition(id) && !isCollected(activity.id))
  const index = list.findIndex(activity => activity.id === id)
  const target = list[index + offset]
  if (!target) return

  list.splice(index, 1)
  list.splice(index + offset, 0, ctx.$router.pages[id])
  list.forEach((activity, index) => {
    const override = getOverride(activity.id)
    override.order = (index + 1) * 100
    cleanOverride(activity.id)
  })
}

function resetActivities() {
  config.value.activities = {}
}

</script>
