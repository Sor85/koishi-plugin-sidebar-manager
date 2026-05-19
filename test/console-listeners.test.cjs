// 控制台消息权限测试。
// 验证读取共享布局不依赖管理员登录态。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')

function loadIndex() {
  const filename = path.resolve(__dirname, '../src/index.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }

  vm.runInNewContext(output, {
    __dirname: path.resolve(__dirname, '../src'),
    exports: module.exports,
    module,
    process,
    require(name) {
      if (name === 'koishi') {
        return {
          Schema: {
            boolean: () => ({
              default: () => ({
                description: () => ({}),
              }),
            }),
            object: value => value,
          },
        }
      }
      if (name === '@koishijs/console') return {}
      if (name === './storage') {
        return {
          clearActivityLayout: () => undefined,
          readActivityLayout: () => undefined,
          saveActivityLayout: () => undefined,
          SIDEBAR_LAYOUT_TABLE: 'sidebar_manager_layout',
        }
      }
      return require(name)
    },
  }, { filename })

  return module.exports
}

const listeners = {}
let injectedServices
const plugin = loadIndex()
const { apply } = plugin

assert.deepEqual(JSON.parse(JSON.stringify(plugin.inject)), {
  optional: ['console', 'database'],
})

apply({
  inject(services, callback) {
    injectedServices = services
    callback({
      console: {
        addEntry() {},
        addListener(name, callback, options) {
          listeners[name] = options
        },
      },
    })
  },
  model: {
    extend() {},
  },
}, {})

assert.deepEqual(JSON.parse(JSON.stringify(injectedServices)), {
  console: { required: true },
  database: { required: false },
})
assert.deepEqual(JSON.parse(JSON.stringify(listeners['sidebar-manager/get-layout'])), { authority: 0 })
assert.deepEqual(JSON.parse(JSON.stringify(listeners['sidebar-manager/save-layout'])), { authority: 4 })
assert.deepEqual(JSON.parse(JSON.stringify(listeners['sidebar-manager/clear-layout'])), { authority: 4 })
