// 侧栏布局持久化测试。
// 通过转译真实前端工具文件验证排序稳定性。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')

function loadActivityLayout(watch = () => {}) {
  const filename = path.resolve(__dirname, '../client/activity-layout.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const storage = new Map()
  const module = { exports: {} }

  vm.runInNewContext(output, {
    console,
    exports: module.exports,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      removeItem: key => storage.delete(key),
      setItem: (key, value) => storage.set(key, String(value)),
    },
    module,
    require(name) {
      if (name === 'vue') return { watch }
      return require(name)
    },
  }, { filename })

  return module.exports
}

function createContext(ids, disabled = {}) {
  const pages = {}
  for (const id of ids) {
    pages[id] = {
      id,
      options: {
        order: 0,
        position: id === 'sidebar-manager' ? 'bottom' : 'top',
      },
      disabled: () => !!disabled[id],
    }
  }
  return { $loader: { initTask: Promise.resolve() }, $router: { pages } }
}

function extractUncollectedOrders(config) {
  return Object.fromEntries(['alpha', 'beta'].map(id => [id, config.activities[id].order]))
}

function persist(ids) {
  const { persistCurrentLayout } = loadActivityLayout()
  const config = {
    activities: {
      collected: {
        parent: 'sidebar-manager',
      },
    },
  }
  persistCurrentLayout(createContext(ids), config)
  return config
}

(async () => {
  const first = persist(['alpha', 'beta', 'collected', 'sidebar-manager'])
  const second = persist(['beta', 'alpha', 'collected', 'sidebar-manager'])

  assert.deepEqual(
    extractUncollectedOrders(first),
    extractUncollectedOrders(second),
    '相同 order 的未收纳项不应受注册顺序影响',
  )
  assert.ok(first.activities.alpha.order < first.activities.beta.order)

  const { initializeActivityLayout } = loadActivityLayout()
  const ctx = createContext(['alpha', 'beta'], { beta: true })
  let resolveInit
  ctx.$loader.initTask = new Promise(resolve => resolveInit = resolve)

  const config = { activities: { alpha: { order: 100 }, beta: { order: 200 } } }
  const stop = initializeActivityLayout(ctx, { value: config })
  assert.deepEqual(config.activities, { alpha: { order: 100 }, beta: { order: 200 } })

  resolveInit()
  await Promise.resolve()
  assert.deepEqual(
    config.activities,
    { alpha: { order: 100 }, beta: { order: 200 } },
    '启动初始化不应因为活动项暂时 disabled 而重写布局',
  )

  stop()
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
