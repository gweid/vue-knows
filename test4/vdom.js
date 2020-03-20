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