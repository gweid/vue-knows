// {data: {text: '', info: {name: ''}}}

class KVue {
  constructor(option) {
    this.$op = option
    this.$data = option.data

    // 设置监听函数
    this.observer(this.$data)

    // new Watcher()
    // this.$data.text
    // new Watcher()
    // this.$data.info.name
  }

  observer(value) {
    if (!value || typeof value !== 'object') return

    Object.keys(value).forEach(key => {
      // 响应函数
      this.defineResponse(value, key, value[key])
    })
  }

  defineResponse(obj, key, val) {
    // 递归解决数据嵌套
    this.observer(val)

    // const dep = new Dep()

    Object.defineProperty(obj, key, {
      get() {
        // Dep.target && dep.addDep(Dep.target)

        return val
      },
      set(newVal) {
        if (newVal === val) return

        val = newVal

        // dep.nocity()

        console.log(`${key} 数据发生改变: ${val}`)
      }
    })
  }
}

// Dep：用来管理观察者 watcher
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

class Watcher {
  constructor() {
    console.log(Dep)
    Dep.target = this // 给类 Dep 添加属性 target
    console.log(Dep.target)
  }

  update() {
    console.log('属性更新了')
  }
}
