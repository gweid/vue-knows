// new Compile(el, vm)

class Compile {
    constructor(el, vm) {
        this.$el = document.querySelector(el)
        this.$vm = vm

        if (this.$el) {
            this.$fragment = this.node2Fragement(this.$el)
            this.compile(this.$fragment)
            this.$el.appendChild(this.$fragment)
        }
    }

    node2Fragement(el) {
        const fragment = document.createDocumentFragment()

        let child
        while (child = el.firstChild) {
            fragment.appendChild(child)
        }

        return fragment
    }

    compile(fragment) {
        const childNodes = fragment.childNodes

        Array.from(childNodes).forEach(node => {
            if (this.isElement(node)) {
                const nodeAttrs = node.attributes
                // console.log(nodeAttrs);
                Array.from(nodeAttrs).forEach(attr => {
                    const attrName = attr.name
                    const exp = attr.value
                    // console.log(attrName, exp);
                    // 是否指令
                    if (this.isDirective(attrName)) {
                        // k-text
                        const dir = attrName.substring(2)
                        console.log(dir);
                        console.log(this[dir + "Direct"]);

                        this[dir + "Direct"] && this[dir + "Direct"](node, this.$vm, exp)
                    }
                    // 是否事件
                    if (this.isEvent(attrName)) {
                        console.log("事件");
                    }
                })
            }
            if (this.isInterpolation(node)) {
                this.compileText(node)
            }

            if (node.childNodes && node.childNodes.length > 0) {
                this.compile(node)
            }
        })
    }

    // 编译插值文本
    compileText(node) {
        if (!this.$vm.$data[RegExp.$1]) return

        this.undateFun(node, this.$vm, RegExp.$1, 'text')
    }

    // 编译指令文本
    textDirect(node, vm, exp) {
        this.undateFun(node, vm, exp, 'text')
    }

    // 更新函数
    undateFun(node, vm, exp, dir) {
        const updateFn = this[dir + 'Updater']

        updateFn && updateFn(node, vm.$data[exp])

        new Watcher(vm, exp, function (value) {
            updateFn && updateFn(node, value)
        })
    }

    textUpdater(node, val) {
        node.textContent = val
    }

    // 是否元素节点
    isElement(node) {
        return node.nodeType === 1
    }

    // 是否文本节点并且是插值文本
    isInterpolation(node) {
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }

    // 是否指令
    isDirective(attrName) {
        return attrName.indexOf("k-") == 0
    }

    // 是否指令
    isEvent(attrName) {
        return attrName.indexOf("@") == 0
    }
}