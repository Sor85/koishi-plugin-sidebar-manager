// 侧栏布局服务端存储测试。
// 使用假的 Koishi 数据库验证读写和无数据库兜底行为。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')

function loadStorage() {
  const filename = path.resolve(__dirname, '../src/storage.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }

  vm.runInNewContext(output, {
    Date,
    exports: module.exports,
    module,
    require,
  }, { filename })

  return module.exports
}

class FakeDatabase {
  constructor() {
    this.rows = new Map()
  }

  async get(table, query) {
    const row = this.rows.get(`${table}:${query.id}`)
    return row ? [row] : []
  }

  async upsert(table, rows) {
    for (const row of rows) {
      this.rows.set(`${table}:${row.id}`, row)
    }
  }

  async remove(table, query) {
    this.rows.delete(`${table}:${query.id}`)
  }
}

(async () => {
  const {
    clearActivityLayout,
    readActivityLayout,
    saveActivityLayout,
  } = loadStorage()

  assert.equal(await readActivityLayout({}), undefined)
  assert.equal(await saveActivityLayout({}, { alpha: { order: 100 } }), false)
  assert.equal(await clearActivityLayout({}), false)

  const database = new FakeDatabase()
  const ctx = { database }
  const layout = {
    alpha: {
      hidden: false,
      order: 100,
      parent: 'sidebar-manager',
      position: 'top',
      ignored: true,
    },
    beta: {
      hidden: 'no',
      order: 200,
      position: 'middle',
    },
  }

  assert.equal(await saveActivityLayout(ctx, layout), true)
  const saved = JSON.parse(JSON.stringify(await readActivityLayout(ctx)))
  assert.deepEqual(saved, {
    alpha: {
      hidden: false,
      order: 100,
      parent: 'sidebar-manager',
      position: 'top',
    },
    beta: {
      order: 200,
    },
  })

  assert.equal(await clearActivityLayout(ctx), true)
  assert.equal(await readActivityLayout(ctx), undefined)
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
