// {{data: {text: '', info: {name: ''}}}}

class KVue {
  constructor(option) {
    this.$op = option
    this.$data = option.data

    // 劫持监听
    this.observer(this.$data)

    // new Watcher()
    // this.$data.text
    // new Watcher()
    // this.$data.info.name
    new Compile(this.$op.el, this)

    // 处理钩子函数
    if (option.created) {
      option.created.call(this)
    }
  }

  observer(value) {
    if (!value || typeof value !== 'object') return

    Object.keys(value).forEach(key => {
      // 数据响应
      this.defineRes(value, key, value[key])
      this.proxyData(key)
    })
  }

  // 响应式
  defineRes(obj, key, val) {
    this.observer(val)

    const dep = new Dep()

    Object.defineProperty(obj, key, {
      get() {
        Dep.target && dep.addDep(Dep.target) // 添加依赖

        return val
      },
      set(newVal) {
        if (newVal === val) return
        val = newVal

        dep.nocity() // 通知去做更新操作
        // console.log("更新了");
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

  // 添加依赖
  addDep(dep) {

    this.deps.push(dep)
  }

  // 通知更新
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
  }

  update() {
    // console.log("更新了");
    this.callback.call(this.vm, this.vm[this.key])
  }
}