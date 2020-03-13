### vue 理解

#### 一、初始化

在 new Vue() 之后，vue 进行初始化生命周期、事件、prpps、data、computed 与 watch 等，主要是通过 Object.defineProperty 设置 setter 与 getter，用来实现响应式以及依赖收集。初始化之后调用 $mount 挂载组件。

$mount 挂载之后会启动编译器 compile, compile 主要就是对模板(也就是写的那些 .vue 文件)进行一遍扫描，形成渲染或者更新函数，生成一棵虚拟 DOM 树，当需要更新页面的时候，会使用 diff 算法进行比较，新值与老值进行比较，计算出需要做的最小的改变，最后才去更新页面，减少页面渲染次数。

compile 除了去扫描，还做一件非常重要的事，就是依赖收集。通过依赖收集，就知道当数据更新的时候需要更新的是哪一个节点。

![图片](/imgs/img1.png)

![图片](/imgs/img2.png)

#### 二、编译。  实例 test3
核心: 获取 DOM, 遍历 DOM, 获取 {{}} 设置的变量，以及每个 DOM 的属性，截获 v-xx、@xx 等。生成 AST 语法树，形成虚拟 DOM，绑定更新函数，把 AST 语法树转换为渲染函数

![图片](/imgs/img5.png)

-   1、parse
    -   使用正则解释 template 中的 Vue 指令(v-xxx)变量等，形成 AST 语法树
-   2、optimize
    -   标记一些静态节点，用于优化，在 diff 比较的时候略过。
-   3、generate
    -   把 parse 生成的 AST 语法树转换为渲染函数 render function

```

```

#### 三、虚拟 DOM

虚拟 DOM 就是用 js 对象来描述一个真实 dom 结构，当数据修改的时候，会生成一颗新的虚拟 DOM 树, 然后做 diff 计算，对比出新旧 DOM 树的变化，最后汇总，一次性改变更新节点。主要原因就是 js 的运行非常快，但是操作页面 dom 非常慢，通过在 js 中比较完再一次性修改。

```
{
    tag: 'div',
    props: {
        name: '节点',
        style: {color: red},
        onClick: xx
    },
    children: [
        {
            tag: 'p',
            text: '内容'
        }
    ]
}
```

#### 四、diff 算法
diff 算法是一种通过同层的树节点进行比较的高效算法，避免了对树进行逐层搜索遍历

![图片](/imgs/img4.png)

#### 五、Vue2 的响应式原理
主要利用了 Object.defineProperty 的数据劫持

##### 简单用 Object.defineProperty 实现。  实例 test1

```
var obj = {}

Object.defineProperty(obj, 'name', {
    get: function () {
        // 返回值
        return document.querySelector('#name').innerHTML
    },
    set: function (val) {
        // 设置值
        document.querySelector('#name').innerHTML = val
    }
}

obj.name = "jack"
```

##### 六、模拟 vue 实现一个数据劫持。  实例 test2
依赖收集：每次进行更新的时候，会对模板视图进行扫描，判断哪些地方对发生更改的数据有依赖，再更新视图

![图片](/imgs/img3.png)

```
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

var kvue = new Kvue({
    data: {
        text: "哈哈",
        foo: {
            name: "你好"
        }
    }
})
kvue.$data.text = '哈哈哈'
kvue.$data.foo.name = '你好吗'
```
