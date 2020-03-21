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

![图片](/imgs/img6.png)

-   Vue.js 通过编译将 template 模板转换成渲染函数(render ) ，执行渲染函数就可以得到一个虚拟节点树
-   在对 Model 进行操作的时候，会触发对应 Dep 中的 Watcher 对象。Watcher 对象会调用对应的 update 来修改视图。这个过程主要是将新旧虚拟节点进行差异对比（patch），然后根据对比结果进行 DOM 操作来更新视图。

##### 问题

1. vue 中虚拟 DOM 是如何创建的
   template
   div 各种标签和组件
   会编译成新建虚拟 DOM 函数 (compile 模块， 解析成 render 函数) AST
   script
   style
2. vue 中虚拟 DOM 是如何 diff 的 新老子元素，都是数组的时候，怎么去做优化? 思想 数组大都是新增、删除、倒序
    - [123]-->[1243] 开头一样，直接减少开头的对比
    - [123]-->[0123] 后面遍历
    - [123]-->[321] 倒序
    - 如果没有那些特殊情况，就开启遍历

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

3、diff-dom 比较渲染

```
// 渲染函数
// vnode: 要渲染的虚拟 DOM    container: 要挂载的容器
class RenderFn {
    constructor(vnode, container) {

        this.vnode = vnode
        this.container = document.querySelector(container)

        if (this.container.vnode) {

            // 更新 this.container.vnode: 旧的dom   vnode: 新的dom   this.container: 容器
            this.patchFn(this.container.vnode, vnode, this.container)
        } else {
            // 首次渲染  vnode: 虚拟dom   this.container: 容器
            this.mountFn(vnode, this.container)
        }

        // 每次渲染完都把 vnode 保存，用来分辨是首次渲染还是更新操作，并且与旧的对比更新 diff-dom
        this.container.vnode = vnode
    }

    // 更新
    patchFn(prev, next, container) {
        let prevFlag = prev.flag
        let nextFlag = next.flag

        if (prevFlag !== nextFlag) {
            // 直接替换
            this.replaceVnode(prev, next, container)
        } else if (nextFlag == vnodeType.HTML) {
            // 如果是元素
            this.patchElement(prev, next, container)
        } else if (nextFlag == vnodeType.TEXT) {
            this.patchText(prev, next)
        }
    }

    // 替换
    replaceVnode(prev, next, container) {
        // 在容器上删除节点
        container.removeChild(prev.el)
        // 再渲染
        this.mountFn(next, container)
    }

    // 更新元素
    patchElement(prev, next, container) {
        // 标签不一样，直接替换
        if (prev.tag !== next.tag) {
            this.replaceVnode(prev, next, container)
            return
        }

        // 更新属性
        let el = (next.el = prev.el) // 旧 dom 赋给新 dom
        let prevData = prev.data
        let nextData = next.data

        if (prevData) {
            for (let key in prevData) {
                let prevVal = prevData[key]
                // 如果旧的 dom 有值的属性在新的 dom 中没有, 那么删除
                if (prevVal && !nextData.hasOwnProperty(key)) {
                    this.patchData(el, key, prevVal, null)
                }
            }
        }

        if (nextData) {
            for (let key in nextData) {
                let prevVal = prevData[key]
                let nextVal = nextData[key]

                this.patchData(el, key, prevVal, nextVal)
            }
        }

        // 更新子元素
        this.patchChildren(el, prev.childFlag, next.childFlag, prev.children, next.children)
    }

    // 更新子元素
    patchChildren(el, prevChildFlag, nextChildFlag, prevChildren, nextChildren) {
        // 1、老的是单独的
        // 老的是空的
        // 老的是多个

        // 2、新的是单独的
        // 新的是空的
        // 新的是多个

        let _this = this

        let handle = {
            // 老的单独, 新的空
            ['SINGLE_EMPTY']() {
                el.removeChild(prevChildren.el)
            },
            // 老的单独, 新的单独
            ['SINGLE_SINGLE']() {
                _this.patchFn(prevChildren, nextChildren, el)
            },
            // 老的单独, 新的多个
            ['SINGLE_MULTIPLE']() {
                el.removeChild(prevChildren.el)
                nextChildren.forEach(item => {
                    _this.mountFn(item, el)
                })
            },
            // 老的空, 新的空
            ['EMPTY_EMPTY']() {},
            // 老的空, 新的单独
            ['EMPTY_SINGLE']() {
                _this.mountFn(nextChildren, el)
            },
            // 老的空, 新的多个
            ['EMPTY_MULTIPLE']() {
                nextChildren.forEach(item => {
                    _this.mountFn(item, el)
                })
            },
            // 老的多个, 新的空
            ['MULTIPLE_EMPTY']() {
                prevChildren.forEach(item => {
                    el.removeChild(item.el)
                })
            },
            // 老的多个, 新的单独
            ['MULTIPLE_SINGLE']() {
                prevChildren.forEach(item => {
                    el.removeChild(item.el)
                })

                _this.mountFn(nextChildren, el)
            },
            // 老的多个, 新的多个
            ['MULTIPLE_MULTIPLE']() {
                // 主要的 diff-dom 是这里
                // 老的[abc]
                // 新的
                // [abc] 三个元素的位置是递增，不需要修改
                // [cba] 位置不是递增，需要修改
                let lastIndex = 0
                for (let i = 0; i < nextChildren.length; i++) {
                    let find = false
                    let nextVnode = nextChildren[i]

                    let j = 0;
                    for (j; j < prevChildren.length; j++) {
                        let prevVnode = prevChildren[j]

                        // 如果 key相同,则认为同一个元素
                        if (nextVnode.data.key === prevVnode.data.key) {
                            find = true

                            _this.patchFn(prevVnode, nextVnode, el)

                            if (j < lastIndex) {
                                // 需要移动  abc a想移动到b元素之后，即a移动到b的下一个元素之前 insertBefor
                                let flagNode = nextChildren[i - 1].el.nextSibling;

                                el.insertBefore(prevVnode.el, flagNode)
                                break
                            } else {
                                lastIndex = j
                            }
                        }
                    }

                    // 需要新增
                    if (!find) {
                        let flagNode = i == 0 ? prevChildren[0].el : nextChildren[i - 1].el.nextSibling
                        _this.mountFn(nextVnode, el, flagNode)
                    }
                }
                // 旧的有，新的没有，删除
                for (let k = 0; k < prevChildren.length; k++) {
                    let prevVnode = prevChildren[k]
                    let has = nextChildren.find(next => next.data.key === prevVnode.data.key)

                    if (!has) {
                        el.removeChild(prevVnode.el)
                    }
                }
            }
        }

        handle[prevChildFlag + '_' + nextChildFlag]()
    }

    // 更新文本
    patchText(prev, next) {
        let el = (next.el = prev.el)

        if (prev.children !== next.children) {
            el.nodeValue = next.children
        }
    }

    // 首次渲染
    mountFn(vnode, container, flagNode) {
        let {
            flag
        } = vnode


        if (flag == vnodeType.HTML) {
            // 如果是节点
            this.mountElement(vnode, container, flagNode)
        } else if (flag == vnodeType.TEXT) {
            // 如果是文本
            this.mountText(vnode, container)
        }
    }

    // 插入元素节点
    mountElement(vnode, container, flagNode) {
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
            for (let key in data) {
                // dom: 当前节点, key: 键名,比如 style, null: 老值  data[key]: 新值
                this.patchData(dom, key, null, data[key])
            }
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

        flagNode ? container.insertBefore(dom, flagNode) : container.appendChild(dom)
    }

    // 插入文本节点
    mountText(vnode, container) {
        let dom = document.createTextNode(vnode.children)
        vnode.el = dom

        container.appendChild(dom)
    }

    // 元素节点挂载属性
    patchData(dom, key, prev, next) {
        switch (key) {
            case 'style':

                // 把新 dom 的属性添加上
                for (let k in next) {
                    dom.style[k] = next[k]
                }

                // 旧的属性在新 dom 上不存在，属性值置空
                for (let k in prev) {
                    if (next == null) {
                        dom.style[k] = ''
                    } else if (!next.hasOwnProperty(k)) {
                        dom.style[k] = ''
                    }
                }

                break;
            case 'class':
                dom.className = next
                break;
            default:
                // 事件
                if (key[0] === '@') {
                    if (prev) {
                        dom.removeEventListener(key[0], prev)
                    }
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

#### 四、diff 算法（参考 三 中 diff-dom 的比较）

Vue 的 diff 算法是仅在同级的 vnode 间做 diff，递归地进行同级 vnode 的 diff，最终实现整个 DOM 树的更新。因为跨层级的操作是非常少的，忽略不计，这样时间复杂度就从 O(n3) 变成 O(n)。

##### diff 算法的假设

-   Web UI 中 DOM 节点跨层级的移动操作特别少，可以忽略不计。
-   拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
-   对于同一层级的一组子节点，它们可以通过唯一 id 进行区分。

##### patch 过程

-   当新旧虚拟节点的 key 和 sel 都相同时，则进行节点的深度 patch，若不相同则整个替换虚拟节点，同时创建真实 DOM，实现视图更新。
-   如何判定新旧节点是否为同一节点：
    当两个 VNode 的 tag、key、isComment 都相同，并且同时定义或未定义 data 的时候，且如果标签为 input 则 type 必须相同。这时候这两个 VNode 则算 sameVnode，可以直接进行 patchVnode 操作。

##### patchVnode 的规则

-   1.如果新旧 VNode 都是静态的，同时它们的 key 相同（代表同一节点），那么只需要替换 elm 以及 componentInstance 即可（原地复用）。
-   2.新老节点均有 children 子节点且不同，则对子节点进行 diff 操作，调用 updateChildren，这个 updateChildren 也是 diff 的核心。
-   3.如果只有新节点存在子节点，先清空老节点 DOM 的文本内容，然后为当前 DOM 节点加入子节点。
-   4.如果只有老节点有子节点，直接删除老节点的子节点。
-   5.当新老节点都无子节点的时候，只是文本的替换。
-   6.当新老节点都有子节点的时候，这时候就是 diff-dom 比对的时候（参考 三 diff-dom 比对）

![图片](/imgs/img4.png)

diff 流程

![图片](/imgs/img7.png)

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
