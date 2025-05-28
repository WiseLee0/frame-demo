import { getSharedStage } from "../App"
import { getProjectState } from "../projectState"
import { hitTestRectNodes } from "./intersect"
import { transformRenderNode } from "./transformRenderNode"

export const getPointerForElement = () => {
    const stage = getSharedStage()
    const elements = getProjectState('elements')
    const scale = getProjectState('scale')
    const hotRect = 4 / scale
    const pos = stage.getRelativePointerPosition()
    if (!pos) return null;
    const node = {
        x: pos.x - hotRect, y: pos.y - hotRect, width: hotRect, height: hotRect, rotation: 0
    }
    const len = elements.length
    for (let i = 0; i < len; i++) {
        const element = elements[len - i - 1];
        const renderNode = transformRenderNode(element);
        if (hitTestRectNodes(node, renderNode)) {
            let removeIds = []
            // Frame则跟内部元素在碰撞一次
            if (element.type === 'frame' && element.elements.length) {
                for (const innerElement of element.elements) {
                    const innerRenderNode = transformRenderNode(innerElement);
                    // Frame不能旋转，这里先简单处理
                    const frameNode = {
                        ...innerRenderNode,
                        x: element.x + innerRenderNode.x,
                        y: element.y + innerRenderNode.y,
                    }
                    if (hitTestRectNodes(node, frameNode)) {
                        return {
                            id: frameNode.id,
                            renderNode: frameNode,
                            element: innerElement,
                            removeIds: [element.id]
                        };
                    }
                }
                removeIds.push(...element?.elements.map((item: any) => item.id))
            }

            return {
                id: element.id,
                renderNode,
                element,
                removeIds
            };
        }
    }

    return null
}