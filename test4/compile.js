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

    compile(fragment) {
        const childNodes = fragment.childNodes

        console.log(Array.from(childNodes));
        Array.from(childNodes).forEach(node => {
            // 类型判断 是元素还是文本; 文本如果不是插值文本，不需要编译
            if (this.isElement(node)) {


            } else if (this.isInterpolation(node)) {
                // if (!this.$vm.$data[RegExp.$1]) return
                // node.textContent = this.$vm.$data[RegExp.$1]

                this.compileTxt(node)
            }


            // 递归子节点
            if (node.childNodes && node.childNodes.length > 0) {
                this.compile(node)
            }
        })
    }

    // 编译文本
    compileTxt(node) {
        if (!this.$vm.$data[RegExp.$1]) return
        this.updateFun(node, this.$vm, RegExp.$1, 'text')
    }

    // 更新函数
    updateFun(node, vm, exp, dir) {
        const updateFn = this[dir + 'Updater']

        updateFn && updateFn(node, vm.$data[exp])

        new Watcher(vm, exp, function (value) {
            updateFn && updateFn(node, value)
        })
    }

    // 更新文本
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
}