import { useEffect } from "react"
import { getProjectState, setProjectState } from "../projectState"
import { getSharedStage } from "../App"
import { getSelectionBoxState, getTransform, hitTestRectNodes, isPointInRect } from "../selection-box"
import { getHoverSelectionRectState, setHoverSelectionRectState } from "."
import { getGhostSelectionRectState } from "../ghost-selection-rect"
export const useHoverSelectionRectEvent = () => {
    useEffect(() => {
        const stage = getSharedStage()
        const handleMouseDown = () => {
            const node = getHoverSelectionRectState('node')
            if (!node) {
                setProjectState({ selection: [] })
                return;
            }
            if (!getProjectState('selection').includes(node.id)) {
                setProjectState({ selection: [node.id] })
            }
        }
        const handleMouseMove = () => {
            const pos = stage.getRelativePointerPosition()
            const ghostNode = getGhostSelectionRectState('node')
            const scale = getProjectState('scale')
            if (!pos || ghostNode) {
                setHoverSelectionRectState({ node: null })
                return
            }
            const [x, y] = [pos.x, pos.y];
            const elements = getProjectState('elements')
            const selectionBox = getSelectionBoxState('nodes')
            // 判断是否在框选锚点热区内，如果在则不能进行Hover
            if (hoverSelectionBox(selectionBox, pos)) {
                setHoverSelectionRectState({ node: null })
                return;
            }
            const hotRect = 4 / scale
            const node = {
                x: x - hotRect, y: y - hotRect, width: hotRect, height: hotRect, rotation: 0
            }
            // 判断是否在框选范围内，如果在则不能进行Hover
            for (let i = 0; i < selectionBox.length; i++) {
                const element = selectionBox[i];
                if (hitTestRectNodes(node, element)) {
                    setHoverSelectionRectState({ node: null })
                    return;
                }
            }
            const len = elements.length
            for (let i = 0; i < len; i++) {
                const element = elements[len - i - 1];
                if (hitTestRectNodes(node, element)) {
                    setHoverSelectionRectState({ node: element })
                    return;
                }
            }
            setHoverSelectionRectState({ node: null })
        }

        const hoverSelectionBox = (boxs: any[], pos: { x: number, y: number }) => {
            if (!boxs?.length) return;
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
                        stage.content.style.cursor = anchor.cursor
                        return true
                    }
                }

                // 旋转热区
                const rotationHoverVal = 22 / scale
                const diff = 6 / scale
                const rotationRects = [
                    { id: 'rotation-top-left', cursor: 'top-left-rotation', x: - anchorHoverVal / 2 - diff, y: - anchorHoverVal / 2 - diff, width: rotationHoverVal, height: rotationHoverVal },
                    { id: 'rotation-top-right', cursor: 'top-right-rotation', x: box.width - anchorHoverVal / 2, y: - anchorHoverVal / 2 - diff, width: rotationHoverVal, height: rotationHoverVal },
                    { id: 'rotation-bottom-left', cursor: 'bottom-left-rotation', x: - anchorHoverVal / 2 - diff, y: box.height - anchorHoverVal / 2, width: rotationHoverVal, height: rotationHoverVal },
                    { id: 'rotation-bottom-right', cursor: 'bottom-right-rotation', x: box.width - anchorHoverVal / 2, y: box.height - anchorHoverVal / 2, width: rotationHoverVal, height: rotationHoverVal }
                ]
                for (const rotationAnchor of rotationRects) {
                    if (isPointInRect(boxPos, rotationAnchor)) {
                        stage.content.style.cursor = ''
                        setProjectState({ cursor: rotationAnchor.cursor })
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
                        stage.content.style.cursor = borderAnchor.cursor
                        return true
                    }
                }

                return false
            }
            for (const box of boxs) {
                if (hoverBox(box)) return true
            }

            stage.content.style.cursor = ''
            setProjectState({ cursor: '' })
            return false
        }




        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [])
}