import { useEffect, useRef } from "react"
import { getProjectState, useProjectState } from "../projectState"
import { changeSelectionRender, clearSelectionNodes, flattenNestedArrays, getPointsBoundingBox, getRotatedRectangleCorners, getSelectionBoxState, getTransform, setSelectionBoxState, useSelectionBoxState } from "."
import { getHoverSelectionRectState } from "../hover-selection-rect"
import { getSharedStage } from "../App"
import _ from "lodash"
import { getElementById } from "../utils"
import { Transform } from "konva/lib/Util"
import { getCursor } from "../cursor"

export const useSelectionBoxEvent = () => {
    const selection = useProjectState('selection')
    const renderDep = useSelectionBoxState('renderDep')
    const mouseRef = useRef({
        isDown: false,
        stageX: 0,
        stageY: 0,
        currentStageX: 0,
        currentStageY: 0,
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
            mouseRef.current.currentStageX = pos.x
            mouseRef.current.currentStageY = pos.y
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
            handleMovementDelta()
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

    const handleOneResize = () => {
        const tr = new Transform();
        tr.reset();
        const element = mouseRef.current.elements[0];
        const oldElement = mouseRef.current.oldElements[0];
        let width = oldElement.width, height = oldElement.height;
        const oldTr = getTransform(oldElement);
        const { hotId, currentStageX, currentStageY, stageX, stageY } = mouseRef.current;
        const [dx, dy] = [currentStageX - stageX, currentStageY - stageY];

        const radians = (oldElement.rotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        // 将全局坐标系的dx/dy转换为元素局部坐标系的delta
        const localDx = dx * cos + dy * sin;
        const localDy = -dx * sin + dy * cos;

        if (hotId === 'border-right') {
            width = oldElement.width + localDx;
        }
        else if (hotId === 'border-bottom') {
            height = oldElement.height + localDy;
        }
        else if (hotId === 'border-left') {
            width = oldElement.width - localDx;
            tr.translate(localDx, 0);
        }
        else if (hotId === 'border-top') {
            height = oldElement.height - localDy;
            tr.translate(0, localDy);
        } else if (hotId === 'anchor-top-left') {
            width = oldElement.width - localDx;
            height = oldElement.height - localDy;
            tr.translate(localDx, localDy);
        } else if (hotId === 'anchor-top-right') {
            width = oldElement.width + localDx;
            height = oldElement.height - localDy;
            tr.translate(0, localDy);
        } else if (hotId === 'anchor-bottom-left') {
            width = oldElement.width - localDx;
            height = oldElement.height + localDy;
            tr.translate(localDx, 0);
        } else if (hotId === 'anchor-bottom-right') {
            width = oldElement.width + localDx;
            height = oldElement.height + localDy;
        } else if (hotId.includes('rotation')) {
            const halfW = oldElement.width / 2;
            const halfH = oldElement.height / 2;
            const invTr = oldTr.copy().invert();
            const { x: localDx, y: localDy } = invTr.point({ x: currentStageX, y: currentStageY });

            // 计算元素中心点
            const centerX = halfW;
            const centerY = halfH;

            // 计算鼠标相对于元素中心的角度
            const mouseAngle = Math.atan2(localDy - centerY, localDx - centerX) * 180 / Math.PI;

            // 计算旋转控制点相对于元素中心的初始角度
            let controlPointAngle = 0;
            if (hotId === 'rotation-top-left') {
                controlPointAngle = Math.atan2(-halfH, -halfW) * 180 / Math.PI;
            } else if (hotId === 'rotation-top-right') {
                controlPointAngle = Math.atan2(-halfH, halfW) * 180 / Math.PI;
            } else if (hotId === 'rotation-bottom-left') {
                controlPointAngle = Math.atan2(halfH, -halfW) * 180 / Math.PI;
            } else if (hotId === 'rotation-bottom-right') {
                controlPointAngle = Math.atan2(halfH, halfW) * 180 / Math.PI;
            }

            // 计算新的旋转角度
            let newRotation = mouseAngle - controlPointAngle;
            newRotation = (newRotation + 360) % 360;

            // 应用旋转
            tr.translate(halfW, halfH);
            tr.rotate(newRotation * (Math.PI / 180));
            tr.translate(-halfW, -halfH);

            // 更新旋转光标
            const stage = getSharedStage()
            if (hotId === 'rotation-top-left') {
                stage.content.style.cursor = getCursor('nwse-rotate', oldElement.rotation + newRotation)
            } else if (hotId === 'rotation-top-right') {
                stage.content.style.cursor = getCursor('nesw-rotate', oldElement.rotation + newRotation)
            } else if (hotId === 'rotation-bottom-right') {
                stage.content.style.cursor = getCursor('senw-rotate', oldElement.rotation + newRotation)
            } else if (hotId === 'rotation-bottom-left') {
                stage.content.style.cursor = getCursor('swne-rotate', oldElement.rotation + newRotation)
            }
        }
        // 应用变换
        const newTr = oldTr.multiply(tr);
        const result = newTr.decompose();

        // 更新元素属性
        element.x = result.x;
        element.y = result.y;
        element.width = width;
        element.height = height;
        element.rotation = result.rotation;
        changeSelectionRender();
    };

    const handleMultipleResize = () => {
        const oldBoxNode = mouseRef.current.oldBoxNode
        const { hotId, currentStageX, currentStageY, stageX, stageY } = mouseRef.current;
        const [dx, dy] = [currentStageX - stageX, currentStageY - stageY];

        let deltaX = 1;
        let deltaY = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (hotId === 'border-right') {
            deltaX = (oldBoxNode.width + dx) / oldBoxNode.width;
        } else if (hotId === 'border-bottom') {
            deltaY = (oldBoxNode.height + dy) / oldBoxNode.height;
        } else if (hotId === 'border-left') {
            deltaX = (oldBoxNode.width - dx) / oldBoxNode.width;
            offsetX = dx;
        } else if (hotId === 'border-top') {
            deltaY = (oldBoxNode.height - dy) / oldBoxNode.height;
            offsetY = dy;
        } else if (hotId === 'anchor-top-left') {
            deltaX = (oldBoxNode.width - dx) / oldBoxNode.width;
            deltaY = (oldBoxNode.height - dy) / oldBoxNode.height;
            offsetX = dx;
            offsetY = dy;
        } else if (hotId === 'anchor-top-right') {
            deltaX = (oldBoxNode.width + dx) / oldBoxNode.width;
            deltaY = (oldBoxNode.height - dy) / oldBoxNode.height;
            offsetY = dy;
        } else if (hotId === 'anchor-bottom-left') {
            deltaX = (oldBoxNode.width - dx) / oldBoxNode.width;
            deltaY = (oldBoxNode.height + dy) / oldBoxNode.height;
            offsetX = dx;
        } else if (hotId === 'anchor-bottom-right') {
            deltaX = (oldBoxNode.width + dx) / oldBoxNode.width;
            deltaY = (oldBoxNode.height + dy) / oldBoxNode.height;
        }

        for (const element of mouseRef.current.elements) {
            const oldElement = mouseRef.current.oldElements.find(e => e.id === element.id)
            element.x = (oldElement.x - oldBoxNode.x) * deltaX + oldBoxNode.x + offsetX
            element.y = (oldElement.y - oldBoxNode.y) * deltaY + oldBoxNode.y + offsetY
            element.width = oldElement.width * deltaX
            element.height = oldElement.height * deltaY

        }
        changeSelectionRender()
    }

    const handleMultipleAndRotationResize = () => {
        const oldBoxNode = mouseRef.current.oldBoxNode
        const { hotId, currentStageX, currentStageY, stageX, stageY } = mouseRef.current;
        const [dx, dy] = [currentStageX - stageX, currentStageY - stageY];

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        // 计算缩放比例，使用较大的变化量来确保等比缩放
        if (hotId === 'border-right') {
            scale = (oldBoxNode.width + dx) / oldBoxNode.width;
            // 以左边中心为固定点进行等比缩放
            const newHeight = oldBoxNode.height * scale;
            offsetX = 0; // 左边固定
            offsetY = (oldBoxNode.height - newHeight) / 2; // 垂直居中
        } else if (hotId === 'border-bottom') {
            scale = (oldBoxNode.height + dy) / oldBoxNode.height;
            // 以上边中心为固定点进行等比缩放
            const newWidth = oldBoxNode.width * scale;
            offsetX = (oldBoxNode.width - newWidth) / 2; // 水平居中
            offsetY = 0; // 上边固定
        } else if (hotId === 'border-left') {
            scale = (oldBoxNode.width - dx) / oldBoxNode.width;
            // 以右边中心为固定点进行等比缩放
            const newWidth = oldBoxNode.width * scale;
            const newHeight = oldBoxNode.height * scale;
            offsetX = oldBoxNode.width - newWidth; // 右边固定
            offsetY = (oldBoxNode.height - newHeight) / 2; // 垂直居中
        } else if (hotId === 'border-top') {
            scale = (oldBoxNode.height - dy) / oldBoxNode.height;
            // 以下边中心为固定点进行等比缩放
            const newWidth = oldBoxNode.width * scale;
            const newHeight = oldBoxNode.height * scale;
            offsetX = (oldBoxNode.width - newWidth) / 2; // 水平居中
            offsetY = oldBoxNode.height - newHeight; // 下边固定
        } else if (hotId === 'anchor-top-left') {
            // 使用对角线距离计算等比缩放
            const oldDiagonal = Math.sqrt(oldBoxNode.width * oldBoxNode.width + oldBoxNode.height * oldBoxNode.height);
            const newDiagonal = Math.sqrt((oldBoxNode.width - dx) * (oldBoxNode.width - dx) + (oldBoxNode.height - dy) * (oldBoxNode.height - dy));
            scale = newDiagonal / oldDiagonal;
            const newWidth = oldBoxNode.width * scale;
            const newHeight = oldBoxNode.height * scale;
            offsetX = oldBoxNode.width - newWidth;
            offsetY = oldBoxNode.height - newHeight;
        } else if (hotId === 'anchor-top-right') {
            const oldDiagonal = Math.sqrt(oldBoxNode.width * oldBoxNode.width + oldBoxNode.height * oldBoxNode.height);
            const newDiagonal = Math.sqrt((oldBoxNode.width + dx) * (oldBoxNode.width + dx) + (oldBoxNode.height - dy) * (oldBoxNode.height - dy));
            scale = newDiagonal / oldDiagonal;
            const newHeight = oldBoxNode.height * scale;
            offsetY = oldBoxNode.height - newHeight;
        } else if (hotId === 'anchor-bottom-left') {
            const oldDiagonal = Math.sqrt(oldBoxNode.width * oldBoxNode.width + oldBoxNode.height * oldBoxNode.height);
            const newDiagonal = Math.sqrt((oldBoxNode.width - dx) * (oldBoxNode.width - dx) + (oldBoxNode.height + dy) * (oldBoxNode.height + dy));
            scale = newDiagonal / oldDiagonal;
            const newWidth = oldBoxNode.width * scale;
            offsetX = oldBoxNode.width - newWidth;
        } else if (hotId === 'anchor-bottom-right') {
            const oldDiagonal = Math.sqrt(oldBoxNode.width * oldBoxNode.width + oldBoxNode.height * oldBoxNode.height);
            const newDiagonal = Math.sqrt((oldBoxNode.width + dx) * (oldBoxNode.width + dx) + (oldBoxNode.height + dy) * (oldBoxNode.height + dy));
            scale = newDiagonal / oldDiagonal;
        }

        // 应用等比缩放到所有元素
        for (const element of mouseRef.current.elements) {
            const oldElement = mouseRef.current.oldElements.find(e => e.id === element.id)
            
            // 计算元素相对于包围盒的位置
            const relativeX = oldElement.x - oldBoxNode.x;
            const relativeY = oldElement.y - oldBoxNode.y;
            
            // 应用等比缩放
            element.x = relativeX * scale + oldBoxNode.x + offsetX;
            element.y = relativeY * scale + oldBoxNode.y + offsetY;
            element.width = oldElement.width * scale;
            element.height = oldElement.height * scale;
            
            // 旋转角度保持不变
            element.rotation = oldElement.rotation;
        }
        
        changeSelectionRender();
    }

    const handleMovementDelta = () => {
        const { elements } = mouseRef.current
        if (!elements?.length) return;
        // 一个元素进行调整
        if (elements.length === 1) {
            handleOneResize()
            return;
        }

        // 多个元素内存在旋转元素
        const hasRotationElements = elements.some((element: any) => element.rotation !== 0);
        if (hasRotationElements) {
            handleMultipleAndRotationResize()
            return;
        }

        // 多个元素进行调整
        handleMultipleResize()
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