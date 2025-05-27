import _ from "lodash"

export const transformRenderNode = (node: any) => {
    if (node.type === "image") {
        return _.cloneDeep({
            ...node,
            width: node.width * node.scaleX,
            height: node.height * node.scaleY,
        })
    }
    if (node.type === "shape_circle") {
        return _.cloneDeep({
            ...node,
            // x: node.x - node.width / 2,
            // y: node.y - node.height / 2,
        })
    }
    return _.cloneDeep(node)
}