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
        console.log(Array.from(childNodes));
        Array.from(childNodes).forEach(node => {
            // 类型判断 是元素还是文本; 文本如果不是插值文本，不需要编译
            if (this.isElement(node)) {
                // console.log('编译元素' + node.nodeName);
                const nodeAttrs = node.attributes
                console.log(Array.from(nodeAttrs));

                Array.from(nodeAttrs).forEach(attr => {
                    // k-text = "name"    attr.name: k-text  attr.value: name
                    const attrName = attr.name
                    const exp = attr.value

                    // 指令
                    if (this.isDirective(attrName)) {
                        
                    }
                    // 事件
                    if (isEvent()) {

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
        return attrName.indexOf("k-") == 1
    }

    // 是否是事件
    isEvent(attrName) {
        return attrName.indexOf("@") == 1
    }
}