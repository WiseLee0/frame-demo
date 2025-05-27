import { useEffect, useRef } from "react"
import { getProjectState, useProjectState } from "../projectState"
import { changeSelectionRender, clearSelectionNodes, flattenNestedArrays, getPointsBoundingBox, getRotatedRectangleCorners, getSelectionBoxConfig, getSelectionBoxState, setSelectionBoxState, useSelectionBoxState } from "."
import { getHoverSelectionRectState } from "../hover-selection-rect"
import { getSharedStage } from "../App"
import _ from "lodash"
import { getElementById } from "../utils"

export const useSelectionBoxEvent = () => {
    const selection = useProjectState('selection')
    const renderDep = useSelectionBoxState('renderDep')
    const mouseRef = useRef({
        isDown: false,
        stageX: 0,
        stageY: 0,
        isEnoughMove: false,
        hotId: '',
        oldBoxNode: {} as any,
        elements: [] as any[],
        oldElements: [] as any[]
    })

    useEffect(() => {
        const stage = getSharedStage()

        const handleMouseDown = () => {
            mouseRef.current.isDown = true
            mouseRef.current.isEnoughMove = false
            const pos = stage.getRelativePointerPosition();
            const hotId = getHoverSelectionRectState('hotId')
            const selection = getProjectState('selection')
            if (!pos || !hotId || !selection.length) {
                mouseRef.current.isDown = false
                return
            }
            mouseRef.current.stageX = pos.x
            mouseRef.current.stageY = pos.y
            mouseRef.current.hotId = hotId
            setSelectionBoxState({ isDragging: true })
        }

        const handleMouseMove = () => {
            if (!mouseRef.current.isDown) return;
            const pos = stage.getRelativePointerPosition()
            if (!pos || !mouseRef.current.isDown) return
            const scale = getProjectState('scale')
            const [dx, dy] = [pos.x - mouseRef.current.stageX, pos.y - mouseRef.current.stageY]
            // 移动阈值
            const moveThreshold = 2 / scale
            if (!mouseRef.current.isEnoughMove && (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold)) {
                const dragNodeId = getSelectionBoxState('dragNodeId')
                const oldBoxNode = getSelectionBoxState('nodes').find(node => node.id === dragNodeId);
                if (oldBoxNode?.selection?.length) {
                    mouseRef.current.oldBoxNode = _.cloneDeep(oldBoxNode)
                    mouseRef.current.elements = getProjectState('selection').map(id => getElementById(id))
                    mouseRef.current.oldElements = _.cloneDeep(mouseRef.current.elements)
                }
                mouseRef.current.isEnoughMove = true
            }
            if (!mouseRef.current.isEnoughMove) {
                return
            }
            handleMovementDelta(dx, dy)
        }

        const handleMouseUp = () => {
            mouseRef.current.isDown = false
            mouseRef.current.isEnoughMove = false
            mouseRef.current.hotId = ''
            setSelectionBoxState({ isDragging: false })
        }

        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

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
    }, [selection, renderDep])

    // 应用单个元素
    const applyElement = ({ element, oldElement, x, y, width, height, config }: any) => {
        let newX = oldElement.x + x;
        let newY = oldElement.y + y;
        let newW = oldElement.width + width;
        let newH = oldElement.height + height;

        // 处理保持宽高比的逻辑
        if (config.keepRatio) {
            const ratio = oldElement.width / oldElement.height;
            if (Math.abs(width) > Math.abs(height)) {
                newH = newW / ratio;
            } else {
                newW = newH * ratio;
            }
        }

        // 处理最小尺寸限制
        if (config.minWH) {
            const [minW, minH] = config.minWH;
            newX = Math.min(newX, oldElement.x + oldElement.width - minW);
            newY = Math.min(newY, oldElement.y + oldElement.height - minH);
            newW = Math.max(newW, minW);
            newH = Math.max(newH, minH);
        }

        // 处理最大尺寸限制
        if (config.maxWH) {
            const [maxW, maxH] = config.maxWH;
            newX = Math.max(newX, oldElement.x + oldElement.width - maxW);
            newY = Math.max(newY, oldElement.y + oldElement.height - maxH);
            newW = Math.min(newW, maxW);
            newH = Math.min(newH, maxH);
        }

        // 应用变换
        element.x = newX;
        element.y = newY;
        element.width = newW;
        element.height = newH;
    }

    // 应用多个元素
    const applyMultiElement = ({ element, oldElement, config, newBoxNode, oldBoxNode }: any) => {
        const rw = newBoxNode.width / oldBoxNode.width
        const rh = newBoxNode.height / oldBoxNode.height

        const sx = (oldElement.x - oldBoxNode.x) / oldBoxNode.width
        const sy = (oldElement.y - oldBoxNode.y) / oldBoxNode.height

        let newX = newBoxNode.x + newBoxNode.width * sx;
        let newY = newBoxNode.y + newBoxNode.height * sy;
        let newW = oldElement.width * rw;
        let newH = oldElement.height * rh;

        // 处理最小尺寸限制
        if (config.minWH) {
            const [minW, minH] = config.minWH;
            newW = Math.max(newW, minW);
            newH = Math.max(newH, minH);
        }

        // 处理最大尺寸限制
        if (config.maxWH) {
            const [maxW, maxH] = config.maxWH;
            newW = Math.min(newW, maxW);
            newH = Math.min(newH, maxH);
        }

        // 应用变换
        element.x = newX;
        element.y = newY;
        element.width = newW;
        element.height = newH;
        return {
            x: newX,
            y: newY,
            width: newW,
            height: newH,
        }
    }

    const handleMovementDelta = (dx: number, dy: number) => {
        const { oldBoxNode, elements, oldElements } = mouseRef.current
        if (!elements?.length) return;
        const hasRotationElements = elements.filter((element: any) => element.rotation !== 0).length;
        // 多选存在旋转元素时，不进行移动
        if (hasRotationElements && elements.length > 1) {
            return;
        }

        const { hotId } = mouseRef.current
        let x = 0, y = 0, width = 0, height = 0;
        if (hotId === 'border-right') {
            width = dx
        }
        if (hotId === 'border-bottom') {
            height = dy
        }
        if (hotId === 'border-left') {
            x = dx
            width = -dx
        }
        if (hotId === 'border-top') {
            y = dy
            height = -dy
        }
        if (hotId === 'anchor-top-left') {
            x = dx
            y = dy
            width = -dx
            height = -dy
        }
        if (hotId === 'anchor-top-right') {
            y = dy
            width = dx
            height = -dy
        }
        if (hotId === 'anchor-bottom-left') {
            x = dx
            width = -dx
            height = dy
        }
        if (hotId === 'anchor-bottom-right') {
            width = dx
            height = dy
        }

        if (elements.length === 1) {
            const element = elements[0]
            const config = getSelectionBoxConfig(element.type)
            applyElement({ element, oldElement: oldElements[0], x, y, width, height, config })
        } else {
            const newBoxNode = {
                x: oldBoxNode.x + x, y: oldBoxNode.y + y,
                width: oldBoxNode.width + width, height: oldBoxNode.height + height
            }

            for (const element of elements) {
                const oldElement = oldElements.find(e => e.id === element.id)
                const config = getSelectionBoxConfig(element.type)
                applyMultiElement({ element, oldElement, oldBoxNode, newBoxNode, config })
            }
        }

        changeSelectionRender()
    }
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
        return [{
            id: 'box-0',
            selection: [node.id],
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            rotation: node.rotation
        }];
    }
    // 如果多个元素被选中，则合并
    const newNodes = []
    for (const nodes of nodesArr) {
        const selection = []
        const points: { x: number, y: number }[] = []
        for (const node of nodes) {
            selection.push(node.id)
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
            id: `box-${newNodes.length}`,
            selection,
            x: box[0],
            y: box[1],
            width: box[2],
            height: box[3],
            rotation: 0
        })
    }
    return newNodes
}