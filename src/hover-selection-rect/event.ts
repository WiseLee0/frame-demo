import { useEffect, useRef } from "react"
import { getProjectState, setProjectState } from "../projectState"
import { getSharedStage } from "../App"
import { getSelectionBoxState, setSelectionBoxState } from "../selection-box"
import { getPointerForElement, getTransform, hitTestRectNodes, isPointInRect } from "../utils"
import { getHoverSelectionRectState, setHoverSelectionRectState } from "."
import { getGhostSelectionRectState } from "../ghost-selection-rect"
import { getCursor } from "../cursor"
export const useHoverSelectionRectEvent = () => {
    const mouseRef = useRef({
        isDown: false,
        isEnoughMove: false,
        clientX: 0,
        clientY: 0,
    })
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            getHoverNode(e.shiftKey)
            mouseRef.current.isEnoughMove = true
            setSelection(e.shiftKey)
            mouseRef.current.isEnoughMove = false
            mouseRef.current.isDown = true
            mouseRef.current.clientX = e.clientX
            mouseRef.current.clientY = e.clientY
        }

        const handleMouseMove = (e: MouseEvent) => {
            getHoverNode(e.shiftKey)
            if (!mouseRef.current.isDown) return;
            if (!mouseRef.current.isEnoughMove) {
                const diffX = e.clientX - mouseRef.current.clientX
                const diffY = e.clientY - mouseRef.current.clientY
                // 移动阈值
                const moveThreshold = 2
                if (!mouseRef.current.isEnoughMove && (Math.abs(diffX) > moveThreshold || Math.abs(diffY) > moveThreshold)) {
                    mouseRef.current.isEnoughMove = true
                }
            }
        }

        const handleMouseUp = (e: MouseEvent) => {
            setSelection(e.shiftKey)
            mouseRef.current.isDown = false
            mouseRef.current.isEnoughMove = false
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

    // 鼠标悬停元素获取
    const getHoverNode = (isShiftKey: boolean = false) => {
        const stage = getSharedStage()
        const pos = stage.getRelativePointerPosition()
        const ghostNode = getGhostSelectionRectState('node')
        const isDragging = getSelectionBoxState('isDragging')
        const selectionBox = getSelectionBoxState('nodes')
        // 存在框选节点，或者正在拖拽，或者没有鼠标位置，则不进行Hover
        if (!pos || ghostNode || isDragging) {
            setHoverSelectionRectState({ node: null })
            return
        }

        const { x, y } = pos
        const scale = getProjectState('scale')
        const hotRect = 4 / scale
        const node = {
            x: x - hotRect, y: y - hotRect, width: hotRect, height: hotRect, rotation: 0
        }

        // 锚点、边框热区内不可Hover
        if (hoverSelectionBox(selectionBox, pos)) {
            setHoverSelectionRectState({ node: null })
            return;
        }

        // 如果没有按住shift键，选区范围内不可Hover
        if (!isShiftKey) {
            for (let i = 0; i < selectionBox.length; i++) {
                const element = selectionBox[i];
                if (hitTestRectNodes(node, element)) {
                    setHoverSelectionRectState({ node: null })
                    return;
                }
            }
        }

        // 鼠标碰撞检测，确定Hover元素
        const pointerForElement = getPointerForElement()
        setHoverSelectionRectState({ node: pointerForElement?.renderNode ?? null })
    }

    // 设置选区元素
    const setSelection = (isShiftKey: boolean = false) => {
        const pointerForElement = getPointerForElement()
        // 点中边框、锚点热区则不进行选区
        const hotId = getHoverSelectionRectState('hotId')

        if (hotId) return;
        const boxs = getSelectionBoxState('nodes')
        if (boxs.length && mouseRef.current.isEnoughMove) {
            return;
        }

        if (!pointerForElement) {
            setProjectState({ selection: [] })
            return;
        }
        const { id, removeIds } = pointerForElement
        const selection = getProjectState('selection')
        if (isShiftKey) {
            if (selection.includes(id)) {
                setProjectState({ selection: selection.filter(curId => curId !== id) })
            } else {
                let newSelection = selection
                if (removeIds.length) {
                    newSelection = selection.filter(item => !removeIds.includes(item))
                }
                setProjectState({ selection: [...newSelection, id] })
            }
        } else {
            setProjectState({ selection: [id] })
        }
    }
}

const hoverSelectionBox = (boxs: any[], pos: { x: number, y: number }) => {
    if (!boxs?.length) return;
    const stage = getSharedStage()
    const hoverBox = (box: any) => {
        const scale = getProjectState('scale')
        const boxTransform = getTransform(box)
        const boxPos = boxTransform.invert().point(pos)
        // 锚点热区
        const anchorHoverVal = 16 / scale
        const anchorRects = [
            { id: 'anchor-top-left', cursor: 'nwse-resize', x: 0, y: 0, width: anchorHoverVal, height: anchorHoverVal },
            { id: 'anchor-top-right', cursor: 'nesw-resize', x: box.width, y: 0, width: anchorHoverVal, height: anchorHoverVal },
            { id: 'anchor-bottom-left', cursor: 'nesw-resize', x: 0, y: box.height, width: anchorHoverVal, height: anchorHoverVal },
            { id: 'anchor-bottom-right', cursor: 'nwse-resize', x: box.width, y: box.height, width: anchorHoverVal, height: anchorHoverVal }
        ].map(item => ({ ...item, x: item.x - anchorHoverVal / 2, y: item.y - anchorHoverVal / 2 }))
        for (const anchor of anchorRects) {
            if (isPointInRect(boxPos, anchor)) {
                stage.content.style.cursor = getCursor(anchor.cursor as any, box.rotation)
                setHoverSelectionRectState({ hotId: anchor.id })
                return true
            }
        }

        // 旋转热区
        const rotationHoverVal = 22 / scale
        const diff = 6 / scale
        const rotationRects = [
            { id: 'rotation-top-left', cursor: 'nwse-rotate', x: - anchorHoverVal / 2 - diff, y: - anchorHoverVal / 2 - diff, width: rotationHoverVal, height: rotationHoverVal },
            { id: 'rotation-top-right', cursor: 'nesw-rotate', x: box.width - anchorHoverVal / 2, y: - anchorHoverVal / 2 - diff, width: rotationHoverVal, height: rotationHoverVal },
            { id: 'rotation-bottom-left', cursor: 'swne-rotate', x: - anchorHoverVal / 2 - diff, y: box.height - anchorHoverVal / 2, width: rotationHoverVal, height: rotationHoverVal },
            { id: 'rotation-bottom-right', cursor: 'senw-rotate', x: box.width - anchorHoverVal / 2, y: box.height - anchorHoverVal / 2, width: rotationHoverVal, height: rotationHoverVal }
        ]
        for (const rotationAnchor of rotationRects) {
            if (isPointInRect(boxPos, rotationAnchor)) {
                stage.content.style.cursor = getCursor(rotationAnchor.cursor as any, box.rotation)
                setHoverSelectionRectState({ hotId: rotationAnchor.id })
                return true
            }
        }

        // 边框热区
        const borderHoverVal = 16 / scale
        const borderRects = [
            { id: 'border-top', cursor: 'ns-resize', x: 0, y: 0, width: box.width + borderHoverVal, height: borderHoverVal },
            { id: 'border-bottom', cursor: 'ns-resize', x: 0, y: box.height, width: box.width + borderHoverVal, height: borderHoverVal },
            { id: 'border-left', cursor: 'ew-resize', x: 0, y: 0, width: borderHoverVal, height: box.height + borderHoverVal },
            { id: 'border-right', cursor: 'ew-resize', x: box.width, y: 0, width: borderHoverVal, height: box.height + borderHoverVal }
        ].map(item => ({ ...item, x: item.x - borderHoverVal / 2, y: item.y - borderHoverVal / 2 }))
        for (const borderAnchor of borderRects) {
            if (isPointInRect(boxPos, borderAnchor)) {
                stage.content.style.cursor = getCursor(borderAnchor.cursor as any, box.rotation)
                setHoverSelectionRectState({ hotId: borderAnchor.id })
                return true
            }
        }

        return false
    }
    for (const box of boxs) {
        if (hoverBox(box)) {
            setSelectionBoxState({ dragNodeId: box.id })
            return true
        }
    }
    setSelectionBoxState({ dragNodeId: '' })
    setHoverSelectionRectState({ hotId: '' })
    stage.content.style.cursor = ''
    return false
}