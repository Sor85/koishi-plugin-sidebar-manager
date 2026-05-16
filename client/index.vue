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
          <div class="summary-value">{{ collectedActivities.length }}</div>
          <div class="summary-label">已收纳</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">{{ bottomActivities.length }}</div>
          <div class="summary-label">底部项目</div>
        </div>
      </section>

      <section class="toolbar">
        <input v-model.trim="keyword" class="search" placeholder="搜索名称或 ID" />
        <button class="button danger" @click="resetActivities">重置侧栏</button>
      </section>

      <div v-if="filteredActivities.length" class="activity-sections">
        <section class="activity-section">
          <div class="section-title">
            <h2>顶部侧栏项</h2>
            <span>{{ topActivities.length }} 项</span>
          </div>
          <div v-if="topActivities.length" class="activity-list">
            <article v-for="activity in topActivities" :key="activity.id" class="activity-row">
              <div class="activity-icon">
                <k-icon :name="activity.icon" />
              </div>

              <div class="activity-main">
                <div class="activity-name">
                  {{ activity.name }}
                  <span v-if="isHidden(activity.id)" class="badge hidden">已隐藏</span>
                  <span v-else class="badge">顶部</span>
                  <span v-if="getParent(activity.id)" class="badge">分组：{{ getParentName(activity.id) }}</span>
                </div>
                <div class="activity-id">{{ activity.id }}</div>
                <div v-if="activity.desc" class="activity-desc">{{ activity.desc }}</div>
              </div>

              <div class="activity-actions">
                <button class="button" @click="moveUp(activity.id)">上移</button>
                <button class="button" @click="moveDown(activity.id)">下移</button>
                <button class="button" @click="togglePosition(activity.id)">移到底部</button>
                <button class="button" :disabled="isSidebarManager(activity.id)" @click="toggleCollected(activity.id)">收纳</button>
              </div>
            </article>
          </div>
          <div v-else class="empty compact">没有匹配的顶部侧栏项。</div>
        </section>

        <section class="activity-section">
          <div class="section-title">
            <h2>底部侧栏项</h2>
            <span>{{ bottomActivities.length }} 项</span>
          </div>
          <div v-if="bottomActivities.length" class="activity-list">
            <article v-for="activity in bottomActivities" :key="activity.id" class="activity-row">
              <div class="activity-icon">
                <k-icon :name="activity.icon" />
              </div>

              <div class="activity-main">
                <div class="activity-name">
                  {{ activity.name }}
                  <span v-if="isHidden(activity.id)" class="badge hidden">已隐藏</span>
                  <span v-else class="badge">底部</span>
                  <span v-if="getParent(activity.id)" class="badge">分组：{{ getParentName(activity.id) }}</span>
                </div>
                <div class="activity-id">{{ activity.id }}</div>
                <div v-if="activity.desc" class="activity-desc">{{ activity.desc }}</div>
              </div>

              <div class="activity-actions">
                <button class="button" @click="moveUp(activity.id)">上移</button>
                <button class="button" @click="moveDown(activity.id)">下移</button>
                <button class="button" @click="togglePosition(activity.id)">移到顶部</button>
                <button class="button" :disabled="isSidebarManager(activity.id)" @click="toggleCollected(activity.id)">收纳</button>
              </div>
            </article>
          </div>
          <div v-else class="empty compact">没有匹配的底部侧栏项。</div>
        </section>

        <section class="activity-section">
          <div class="section-title">
            <h2>已收纳</h2>
            <span>{{ collectedActivities.length }} 项</span>
          </div>
          <div v-if="collectedActivities.length" class="activity-list">
            <article v-for="activity in collectedActivities" :key="activity.id" class="activity-row">
              <div class="activity-icon">
                <k-icon :name="activity.icon" />
              </div>

              <div class="activity-main">
                <div class="activity-name">
                  {{ activity.name }}
                  <span class="badge collected">已收纳</span>
                </div>
                <div class="activity-id">{{ activity.id }}</div>
                <div v-if="activity.desc" class="activity-desc">{{ activity.desc }}</div>
              </div>

              <div class="activity-actions">
                <button class="button" @click="toggleCollected(activity.id)">取消收纳</button>
              </div>
            </article>
          </div>
          <div v-else class="empty compact">没有匹配的已收纳侧栏项。</div>
        </section>
      </div>

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

const topActivities = computed(() => filteredActivities.value
  .filter((activity) => {
    return !isCollected(activity.id) && getPosition(activity.id) !== 'bottom'
  })
  .slice()
  .reverse())

const bottomActivities = computed(() => filteredActivities.value.filter((activity) => {
  return !isCollected(activity.id) && getPosition(activity.id) === 'bottom'
}))

const collectedActivities = computed(() => filteredActivities.value.filter(activity => isCollected(activity.id)))

function getOverride(id: string) {
  return overrides.value[id] ??= {}
}

function cleanOverride(id: string) {
  if (!Object.keys(overrides.value[id] ?? {}).length) {
    delete overrides.value[id]
  }
}

function getOrder(id: string) {
  return overrides.value[id]?.order ?? ctx.$router.pages[id]?.options.order ?? 0
}

function getPosition(id: string): ActivityPosition {
  return overrides.value[id]?.position ?? ctx.$router.pages[id]?.options.position ?? 'top'
}

function getParent(id: string) {
  return overrides.value[id]?.parent
}

function getParentName(id: string) {
  const parent = getParent(id)
  return parent ? ctx.$router.pages[parent]?.name ?? parent : ''
}

function isSidebarManager(id: string) {
  return id === SIDEBAR_MANAGER_ID
}

function isCollected(id: string) {
  return getParent(id) === SIDEBAR_MANAGER_ID && !isHidden(id)
}

function isHidden(id: string) {
  return !!overrides.value[id]?.hidden
}

function toggleCollected(id: string) {
  if (isSidebarManager(id)) return
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
  moveBy(id, getPosition(id) === 'bottom' ? -1 : 1)
}

function moveDown(id: string) {
  moveBy(id, getPosition(id) === 'bottom' ? 1 : -1)
}

function moveBy(id: string, offset: number) {
  const list = activities.value.filter((activity) => {
    return getPosition(activity.id) === getPosition(id) && !isCollected(activity.id)
  })
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
