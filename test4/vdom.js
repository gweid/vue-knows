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