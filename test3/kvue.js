// new KVue({data: {text: '', info: {name: ''}}})

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

    new Compile(this.$op.el, this)

    // 钩子函数处理
    if (option.created) {

      option.created.call(this) // 执行钩子函数，并把 this 指向 vue 实例，这样在 created 中就可以一直使用 this
    }
  }

  observer(value) {
    if (!value || typeof value !== 'object') return

    Object.keys(value).forEach(key => {
      // 响应函数
      this.defineResponse(value, key, value[key])

      this.proxyData(key)
    })
  }

  defineResponse(obj, key, val) {
    // 递归解决数据嵌套
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

        dep.nocity()

        console.log(`${key} 数据发生改变: ${val}`)
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
  constructor(vm, key, callback) {
    this.vm = vm
    this.key = key
    this.callback = callback
    // console.log(Dep)
    Dep.target = this // 给类 Dep 添加属性 target
    // console.log(Dep.target)
    this.vm[this.key] // 读一下，使 getter 激活添加依赖
    Dep.target = null
  }

  update() {
    // console.log('属性更新了')
    this.callback.call(this.vm, this.vm[this.key])
  }
}