import { useSelectionBoxState } from "."
import { Circle, Group, Rect, Text } from "react-konva"
import { useProjectState } from "../projectState";
import { useEffect, useRef, useState } from "react";
export function SelectionBoxRects() {
    const nodes = useSelectionBoxState('nodes')
    const innerNodes = useSelectionBoxState('innerNodes')
    const scale = useProjectState('scale')

    const renderOuterNode = () => {
        const nodeAnchor = (node: any) => [{ x: 0, y: 0 }, { x: node.width, y: 0 }, { x: 0, y: node.height }, { x: node.width, y: node.height }]
        return nodes.map(node => {
            let direction = "bottom"
            if (node.rotation < -45 && node.rotation > -135) {
                direction = "left"
            } else if (node.rotation > 45 && node.rotation < 135) {
                direction = "right"
            } else if (node.rotation > 135 || node.rotation < -135) {
                direction = "top"
            }
            return <>
                <Group x={node.x} y={node.y} rotation={node.rotation}>
                    <Rect
                        x={0}
                        y={0}
                        width={node.width}
                        height={node.height}
                        stroke="#11B0FF"
                        strokeWidth={1 / scale}
                        listening={false}
                    />
                    {nodeAnchor(node).map((anchor, idx) => {
                        return <Circle
                            x={anchor.x}
                            y={anchor.y}
                            radius={4 / scale}
                            fill={idx === 0 ? "#0CA0EB" : "#FFFFFF"}
                            shadowColor="#00000040"
                            shadowBlur={4 / scale}
                            shadowOffsetX={0}
                            shadowOffsetY={1 / scale}
                            listening={false}
                        />
                    })}
                    <RenderOuterLabel node={node} direction={direction} />
                </Group>
            </>
        })
    }

    return <Group>
        {innerNodes.map(node => {
            return <Rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rotation={node.rotation}
                stroke="#11B0FF"
                strokeWidth={1 / scale}
                listening={false}
            />
        })}
        {renderOuterNode()}
    </Group>
}

const RenderOuterLabel = ({ node, direction }: any) => {
    const scale = useProjectState('scale')
    const textRef = useRef<any>(null);
    const text = `${Math.round(node.width * 100) / 100} × ${Math.round(node.height * 100) / 100}`
    const fontSize = 12 / scale
    const textWidth = (text.length * 10) / scale
    const paddingX = 5 / scale
    const paddingY = 3 / scale
    const [realTextWidth, setRealTextWidth] = useState(0)
    let x = 0
    let y = 0
    let scaleX = 1
    let scaleY = 1
    let textOffsetX = 0
    let textOffsetY = -1.3 / scale
    let rectOffsetX = 0
    let rectOffsetY = 0
    let rotation = 0

    useEffect(() => {
        if (textRef.current) {
            setRealTextWidth(textRef.current.textWidth)
        }
    }, [text, scale])

    if (direction === "bottom") {
        y = node.height + 8 / scale
        textOffsetX = -(node.width - textWidth) / 2
        rectOffsetX = -(node.width - realTextWidth) / 2
    } else if (direction === "top") {
        y = -8 / scale
        textOffsetX = (node.width + textWidth) / 2
        rectOffsetX = (node.width + realTextWidth) / 2
        scaleY = -1
        scaleX = -1
    } else if (direction === "left") {
        x = -8 / scale
        textOffsetX = -(node.height - textWidth) / 2
        rectOffsetX = -(node.height - realTextWidth) / 2
        rotation = 90
    } else if (direction === "right") {
        x = node.width + 8 / scale
        y = node.height
        textOffsetX = -(node.height - textWidth) / 2
        rectOffsetX = -(node.height - realTextWidth) / 2
        rotation = -90
    }

    return <Group x={x} y={y} scaleX={scaleX} scaleY={scaleY} rotation={rotation}>
        <Rect offsetX={rectOffsetX} offsetY={rectOffsetY} x={-paddingX} y={-paddingY} width={realTextWidth + paddingX * 2} height={fontSize + paddingY * 2} fill={"#0CA0EB"} listening={false} cornerRadius={4 / scale} />
        <Text offsetX={textOffsetX} offsetY={textOffsetY} ref={textRef} text={text} fontSize={fontSize} fill={"#fff"} align="center" width={textWidth} listening={false} />
    </Group>
}