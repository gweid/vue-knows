// {data: {text: "", info: {name: ""}}}

class KVue {
  constructor(option) {
    this.$op = option
    this.$data = option.data

    this.observer(this.$data)

    // new Watcher()
    // this.$data.text
    // new Watcher()
    // this.$data.info.name

    new Compile(option.el, this)

    if (option.created) {
      option.created.call(this)
    }
  }

  // 数据劫持
  observer(value) {
    if (!value || typeof value !== 'object') return

    Object.keys(value).forEach(key => {
      this.defineReactive(value, key, value[key])
      this.proxyData(key)
    })
  }

  defineReactive(obj, key, val) {
    this.observer(val)

    const dep = new Dep()

    Object.defineProperty(obj, key, {
      get() {
        Dep.target && dep.addDep(Dep.target)

        return val
      },
      set(newVal) {
        if (newVal === val) return
        val = newVal

        // 通知观察者进行更新操作
        dep.nocity()
      }
    })
  }

  proxyData(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key]
      },
      set(newVal) {
        this.$data[key] = newVal
      }
    })
  }
}

// 依赖收集
class Dep {
  constructor() {
    this.deps = []
  }

  addDep(dep) {
    this.deps.push(dep)
  }

  nocity() {
    this.deps.forEach(dep => dep.update())
  }
}

// 观察者
class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm
    this.key = key
    this.callback = callback

    Dep.target = this
    this.vm[this.key]
    Dep.target = null
  }

  update() {
    this.callback.call(this.vm, this.vm[this.key])
  }
}