import { Group, Rect, Text } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
export function RenderElements() {
    const elements = useProjectState('elements')
    useSelectionBoxState('renderDep')
    return <Render elements={elements} />
}

function Render({ elements }: { elements: any[] }) {
    const scale = getProjectState('scale')
    return elements.map(element => {
        if (element.type === "shape_square") {
            return <Rect
                key={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                fill={element.data.backgroundColor}
            />
        }
        if (element.type === 'frame') {
            return <Group x={element.x} y={element.y} key={element.id}>
                <Text text={element.title} y={-16 / scale} fontSize={14 / scale} fill={'gray'} />
                <Group x={0} y={0} clipHeight={element.height} clipWidth={element.width}>
                    <Rect
                        x={0}
                        y={0}
                        width={element.width}
                        height={element.height}
                        fill={element.fill}
                    />
                    <Render elements={element.elements} />
                </Group>
            </Group>
        }
    })
}