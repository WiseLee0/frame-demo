import { useEffect, useRef } from "react";
import { getSharedStage } from "../App";
import { getGhostSelectionRectState, setGhostSelectionRectState } from ".";
import { getProjectState, setProjectState } from "../projectState";
import { hitTestRectNodes } from "../selection-box";
import { getHoverSelectionRectState } from "../hover-selection-rect";
interface GhostNode {
    x: number;
    y: number;
    width: number;
    height: number;
}
export const useGhostSelectionRectEvent = () => {
    const moveRef = useRef<number | null>(null)
    const mouseRef = useRef({
        isDown: false,
        stageX: 0,
        stageY: 0,
        isEnoughMove: false
    })
    useEffect(() => {
        const stage = getSharedStage()

        const handleMouseDown = () => {
            mouseRef.current.isDown = true
            mouseRef.current.isEnoughMove = false
            const pos = stage.getRelativePointerPosition();
            const hotId = getHoverSelectionRectState('hotId')
            const hoverNode = getHoverSelectionRectState('node')
            if (!pos || hotId || hoverNode) {
                mouseRef.current.isDown = false
                return
            }
            mouseRef.current.stageX = pos.x
            mouseRef.current.stageY = pos.y
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!mouseRef.current.isDown) return
            if (moveRef.current !== null) {
                cancelAnimationFrame(moveRef.current)
                moveRef.current = null;
            }
            const viewportChange = () => {
                const scale = getProjectState('scale')
                const [cx, cy] = changeCanvasOffset(e)
                const pos = stage.getRelativePointerPosition()
                if (!pos || !mouseRef.current.isDown) {
                    return
                }
                const [width, height] = [pos.x - mouseRef.current.stageX, pos.y - mouseRef.current.stageY]
                // 移动阈值
                const moveThreshold = 2 / scale
                if (!mouseRef.current.isEnoughMove && (Math.abs(width) > moveThreshold || Math.abs(height) > moveThreshold)) {
                    mouseRef.current.isEnoughMove = true
                }
                if (!mouseRef.current.isEnoughMove) {
                    return
                }
                if (cx === 0 && cy === 0) {
                    setGhostSelectionRectState({
                        node: {
                            x: mouseRef.current.stageX,
                            y: mouseRef.current.stageY,
                            width,
                            height,
                        }
                    })
                    handleSelection()
                    return;
                }
                const [tx, ty] = [cx, cy].map(v => {
                    if (v === 0) return 0;
                    const speed = 100
                    return v > 0 ? speed : -speed;
                });

                setProjectState({ offsetX: getProjectState('offsetX') + tx, offsetY: getProjectState('offsetY') + ty })

                setGhostSelectionRectState({
                    node: {
                        x: mouseRef.current.stageX,
                        y: mouseRef.current.stageY,
                        width,
                        height,
                    }
                })
                handleSelection()
                moveRef.current = requestAnimationFrame(viewportChange)
            }
            moveRef.current = requestAnimationFrame(viewportChange)
        }

        const handleMouseUp = () => {
            if (mouseRef.current.isDown && mouseRef.current.isEnoughMove) {
                handleSelection()
            }
            mouseRef.current.isDown = false
            mouseRef.current.isEnoughMove = false
            setGhostSelectionRectState({ node: null })
        }

        const changeCanvasOffset = (e: MouseEvent) => {
            let [x, y] = [e.clientX, e.clientY]
            const canvas = stage.content;
            const [ox, oy, ow, oh] = [canvas.offsetLeft, canvas.offsetTop, canvas.offsetWidth, canvas.offsetHeight]
            let rx = 0;
            let ry = 0;
            x -= ox;
            y -= oy;
            if (x <= 1) {
                rx = -1
            }
            if (y <= 1) {
                ry = -1
            }
            if (x > ow) {
                rx = x - ow
            }
            if (y > oh - 2) {
                ry = 2
            }
            return [rx, ry]
        }

        const handleSelection = () => {
            const ghostNode = getGhostSelectionRectState('node')
            if (!ghostNode) {
                setProjectState({ selection: [] })
                return;
            }
            hitSelection(ghostNode)
        }

        const hitSelection = (ghostNode: GhostNode) => {
            const elements = getProjectState('elements')
            const selection = []
            for (const element of elements) {
                if (hitTestRectNodes(getGhostNodeInfo(ghostNode), element)) {
                    selection.push(element.id)
                }
            }
            setProjectState({ selection })
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


}


const getGhostNodeInfo = (node: GhostNode) => {
    let { x, y, width, height } = node
    if (width < 0) {
        x = x + width
        width = -width
    }
    if (height < 0) {
        y = y + height
        height = -height
    }
    return { x, y, width, height, rotation: 0 }
}