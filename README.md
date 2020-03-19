### vue 理解

#### 一、初始化

在 new Vue() 之后，vue 进行初始化生命周期、事件、prpps、data、computed 与 watch 等，主要是通过 Object.defineProperty 设置 setter 与 getter，用来实现响应式以及依赖收集。初始化之后调用 \$mount 挂载组件。

\$mount 挂载之后会启动编译器 compile, compile 主要就是对模板(也就是写的那些 .vue 文件)进行一遍扫描，形成渲染或者更新函数，生成一棵虚拟 DOM 树，当需要更新页面的时候，会使用 diff 算法进行比较，新值与老值进行比较，计算出需要做的最小的改变，最后才去更新页面，减少页面渲染次数。

compile 除了去扫描，还做一件非常重要的事，就是依赖收集。通过依赖收集，就知道当数据更新的时候需要更新的是哪一个节点。

![图片](/imgs/img1.png)

![图片](/imgs/img2.png)

#### 二、编译。 实例 test3

核心: 获取 DOM, 遍历 DOM, 获取 {{}} 设置的变量，以及每个 DOM 的属性，截获 v-xx、@xx 等。生成 AST 语法树，形成虚拟 DOM，绑定更新函数，把 AST 语法树转换为渲染函数

目的: vue 产生的那些模板 html 根本不识别,通过编译的过程，可以进行依赖收集，通过依赖收集，把数据模型 data 和视图之间产生依赖关系，如果数据发生变化，就可以通知产生依赖的地方进行改变，这就是模型驱动视图变化。

![图片](/imgs/img5.png)

-   1、parse
    -   使用正则解释 template 中的 Vue 指令(v-xxx)变量等，形成 AST 语法树
-   2、optimize
    -   标记一些静态节点，用于优化，在 diff 比较的时候略过。
-   3、generate
    -   把 parse 生成的 AST 语法树转换为渲染函数 render function

```
// new Compile(el, vm)  // el: 需要分析的元素  vm: vue 实例

class Compile {
    constructor(el, vm) {
        this.$el = document.querySelector(el) // 要遍历的宿主节点

        this.$vm = vm // vue 实例

        if (this.$el) {
            // 转换内部内容为片段 Fragment
            this.$fragment = this.node2Fragment(this.$el)

            // 执行编译
            this.compile(this.$fragment)

            // 将编译完的 html 结果追加至 $el
            this.$el.appendChild(this.$fragment)
        }
    }

    // 将宿主元素中代码片段拿出来遍历
    node2Fragment(el) {
        // 创建一个新的空白的文档片段
        let fragment = document.createDocumentFragment()

        let child
        while (child = el.firstChild) {
            fragment.appendChild(child)
        }

        return fragment
    }

    // 编译函数
    compile(fragment) {
        const childNodes = fragment.childNodes
        // console.log(childNodes); // NodeList(25) [text, comment, text, p, ...]
        // console.log(Object.prototype.toString.call(childNodes)); // [object NodeList] 为 NodeList 类型

        // 将 NodeList 转换为数组遍历: 方法1：[...childNodes]   方法2：Arrsy.from(childNodes)
        // console.log(Array.from(childNodes));
        Array.from(childNodes).forEach(node => {
            // 类型判断 是元素还是文本; 文本如果不是插值文本，不需要编译
            if (this.isElement(node)) {
                // console.log('编译元素' + node.nodeName);
                const nodeAttrs = node.attributes
                // console.log(Array.from(nodeAttrs));

                Array.from(nodeAttrs).forEach(attr => {
                    // k-text = "name"    attr.name: k-text  attr.value: name
                    const attrName = attr.name
                    const exp = attr.value
                    // console.log(attrName, exp);

                    // 指令
                    if (this.isDirective(attrName)) {
                        const dir = attrName.substring(2)
                        this[dir + "Direct"] && this[dir + "Direct"](node, this.$vm, exp)
                    }
                    // 事件
                    if (this.isEvent(attrName)) {
                        // k-click
                        const dir = attrName.substring(1) // click
                        this.eventHandle(node, this.$vm, exp, dir)
                    }
                })

            } else if (this.isInterpolation(node)) {
                // console.log('编译文本' + node.textContent);
                // console.log(RegExp.$1) // 正则中 () 里面的值
                // 将节点的文本改为 自主实现的 kvue 的 data 中对应的值
                this.compileTxt(node)
            }

            // 递归子节点
            if (node.childNodes && node.childNodes.length > 0) {
                this.compile(node)
            }
        })
    }

    // 编译插值文本
    compileTxt(node) {
        // console.log(RegExp.$1) // 正则中 () 里面的值
        if (!this.$vm.$data[RegExp.$1]) return
        // 将节点的文本改为 自主实现的 kvue 的 data 中对应的值
        // node.textContent = this.$vm.$data[RegExp.$1] // 这只是初始化，没有绑定更新函数，当数据更新，这个不会改变

        // 初始化跟绑定更新函数
        this.updateFun(node, this.$vm, RegExp.$1, 'text')
    }

    // 指令编译文本  k-text
    textDirect(node, vm, exp) {
        this.updateFun(node, vm, exp, 'text')
    }

    // 指令 双向数据绑定  k-model
    modelDirect(node, vm, exp) {
        // 更改 input 内的值
        this.updateFun(node, vm, exp, 'model')

        // 更改 与 input 绑定的 data 的值
        node.addEventListener('input', e => {
            // console.log(vm.$data.name);
            // vm.$data[exp] = e.target.value
            vm[exp] = e.target.value
        })
    }

    // 指令 编译 html  k-html
    htmlDirect(node, vm, exp) {
        this.updateFun(node, vm, exp, 'html')
    }

    // 更新函数
    updateFun(node, vm, exp, dir) {
        // node: 节点  vm: vue实例  exp: 表达式  dir: 指令(文本或者事件等)
        const updateFn = this[dir + 'Updater'] // this[dir + 'Updater'] 相当于 this.fn  组合一个函数名
        // 初始化更新函数
        // console.log(vm.$data[exp]);
        // updateFn && updateFn(node, vm.$data[exp])
        updateFn && updateFn(node, vm[exp]) // 在 KVue 中 proxyData 处理了，可以直接用 vm[exp]，不需要 vm.$data[exp]
        // 依赖收集
        new Watcher(vm, exp, function (value) {
            updateFn && updateFn(node, value)
        })
    }

    // 更新文本函数
    textUpdater(node, value) {
        node.textContent = value
    }

    // 更新双向绑定
    modelUpdater(node, value) {
        // 使 input 框的值与 data 中的一致
        node.value = value
    }

    // 更新 html
    htmlUpdater(node, value) {
        node.innerHTML = value
    }

    // 事件处理
    eventHandle(node, vm, exp, dir) {
        const fn = vm.$op.methods && vm.$op.methods[exp]
        if (dir && fn) {
            node.addEventListener(dir, fn.bind(vm))
        }
    }

    // 是否元素
    isElement(node) {
        return node.nodeType === 1
    }

    // 是否插值文本
    isInterpolation(node) {
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }

    // 是否是指令
    isDirective(attrName) {
        return attrName.indexOf("k-") == 0
    }

    // 是否是事件
    isEvent(attrName) {
        return attrName.indexOf("@") == 0
    }
}
```

#### 三、虚拟 DOM 例 test4

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

1、模拟虚拟 DOM 创建

```
const vnodeType = {
    HTML: 'HTML',
    TEXT: 'TEXT',
    COMPONENT: 'COMPONENT',
    CLASS_COMPONENT: 'CLASS_COMPONENT'
}
const childType = {
    EMPTY: 'EMPTY',
    SINGLE: 'SINGLE',
    MULTIPLE: 'MULTIPLE'
}

// 创建虚拟 DOM
class CreateElement {
    constructor(tag, data, children) {
        this.flag = ''
        this.childFlag = ''

        this.tag = tag
        this.data = data
        this.children = children

        this.flagFn(tag)
        this.childFlagFn(children)
        this.createElement(this.flag, tag, data, children, this.childFlag)
    }

    flagFn(tag) {
        if (typeof tag == 'string') {
            this.flag = vnodeType.HTML
        } else if (typeof tag == 'function') {
            this.flag = vnodeType.COMPONENT
        } else {
            this.flag = vnodeType.TEXT
        }
    }

    childFlagFn(children = null) {
        if (children == null) {
            // 没有子元素
            this.childFlag = childType.EMPTY
        } else if (Array.isArray(children)) {
            if (children.length == 0) {
                // 没有子元素
                this.childFlag = childType.EMPTY
            } else {
                // 有多个子元素
                this.childFlag = childType.MULTIPLE
            }
        } else {
            // 单个
            this.childFlag = childType.SINGLE
            this.children = this.createTextVnode(children)
        }
    }

    // 文本子节点
    createTextVnode(text) {
        return {
            flag: vnodeType.TEXT,
            tag: null,
            data: null,
            children: text,
            childFlag: childType.EMPTY
        }
    }

    // 返回一个虚拟 DOM
    createElement(flag, tag, data, children, childFlag) {
        return {
            flag,
            tag,
            data,
            children,
            childFlag,
            el: null
        }
    }
}
```

2、虚拟 DOM 首次渲染

```
// 渲染函数
// vnode: 要渲染的虚拟 DOM    container: 要挂载的容器
class RenderFn {
    constructor(vnode, container) {

        this.vnode = vnode
        this.container = document.querySelector(container)


        // 区分首次渲染和再次渲染
        this.mountFn(vnode, this.container)
    }

    mountFn(vnode, container) {
        let {
            flag
        } = vnode


        if (flag == vnodeType.HTML) {
            // 如果是节点
            this.mountElement(vnode, container)
        } else if (flag == vnodeType.TEXT) {
            // 如果是文本
            this.mountText(vnode, container)
        }
    }

    mountElement(vnode, container) {
        let dom = document.createElement(vnode.tag)

        // 将当前的 dom 存到虚拟 dom 中
        vnode.el = dom

        let {
            data,
            children,
            childFlag
        } = vnode

        // 挂载 data
        if (data) {
            Object.keys(data).forEach(key => {
                // dom: 当前节点, key: 键名,比如 style, null: 老值  data[key]: 新值
                this.patchData(dom, key, null, data[key])
            })
        }

        if (childFlag != childType.EMPTY) {
            if (childFlag == childType.SINGLE) {
                this.mountFn(children, dom)
            } else if (childFlag == childType.MULTIPLE) {
                children.forEach(item => {
                    this.mountFn(item, dom)
                })
            }
        }

        container.appendChild(dom)
    }

    mountText(vnode, container) {
        let dom = document.createTextNode(vnode.children)
        vnode.el = dom

        container.appendChild(dom)
    }

    patchData(dom, key, prv, next) {
        switch (key) {
            case 'style':
                Object.keys(next).forEach(k => {
                    dom.style[k] = next[k]
                })
                break;
            case 'class':
                dom.className = next
                break;
            default:
                // 事件
                if (key[0] === '@') {
                    if (next) {
                        let eventName = key.substring(1)
                        dom.addEventListener(eventName, next)
                    }

                } else {
                    dom.setAttribute(key, next)
                }
                break;
        }
    }
}
```

#### 四、diff 算法

diff 算法是一种通过同层的树节点进行比较的高效算法，避免了对树进行逐层搜索遍历

![图片](/imgs/img4.png)

#### 五、Vue2 的响应式原理

主要利用了 Object.defineProperty 的数据劫持

##### 简单用 Object.defineProperty 实现。 实例 test1

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

##### 六、模拟 vue 实现一个数据劫持。 实例 test2

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
