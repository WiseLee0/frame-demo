import _ from "lodash"

export const transformRenderNode = (node: any) => {
    if (node.type === "image") {
        return _.cloneDeep({
            ...node,
            width: node.width * node.scaleX,
            height: node.height * node.scaleY,
        })
    }
    return _.cloneDeep(node)
}