import { useEffect } from "react"
import { getProjectState, useProjectState } from "../projectState"
import { clearSelectionNodes, flattenNestedArrays, getPointsBoundingBox, getRotatedRectangleCorners, setSelectionBoxState } from "."
export const useSelectionBoxEvent = () => {
    const selection = useProjectState('selection')

    useEffect(() => {
        if (!selection.length) {
            clearSelectionNodes()
            return
        }
        const elements = getProjectState('elements')
        const nodes = getSelectionNodes(selection, elements) as any[]
        const flatNodes = flattenNestedArrays(nodes)
        const boxs = transformToBoxs(flatNodes) as any[]
        setSelectionBoxState({ nodes: boxs, innerNodes: nodes })
    }, [selection])
}

const getSelectionNodes = (selection: string[], elements: any[]) => {
    const node = []
    for (const element of elements) {
        if (selection.includes(element.id)) {
            node.push({ id: element.id, x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation })
        }
        if (element?.elements) {
            const nodes = getSelectionNodes(selection, element.elements) as any[];
            if (nodes.length) {
                node.push(nodes)
            }
        }
    }
    return node
}

const transformToBoxs = (nodesArr: any[][]) => {
    // 如果只有一个元素被选中，则不合并
    if (nodesArr.length === 1 && nodesArr[0].length === 1) {
        const node = nodesArr[0][0]
        return [node];
    }
    // 如果多个元素被选中，则合并
    const newNodes = []
    for (const nodes of nodesArr) {
        const points: { x: number, y: number }[] = []
        for (const node of nodes) {
            if (node.rotation === 0) {
                points.push({ x: node.x, y: node.y })
                points.push({ x: node.x + node.width, y: node.y })
                points.push({ x: node.x, y: node.y + node.height })
                points.push({ x: node.x + node.width, y: node.y + node.height })
            } else {
                points.push(...getRotatedRectangleCorners(node))
            }
        }
        const box = getPointsBoundingBox(points)
        newNodes.push({
            x: box[0],
            y: box[1],
            width: box[2],
            height: box[3],
            rotation: 0
        })
    }
    return newNodes
}