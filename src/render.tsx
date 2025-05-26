import { Group, Rect, Text } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
export function RenderElements() {
    const elements = useProjectState('elements')
    return <Render elements={elements} />
}

function Render({ elements }: { elements: any[] }) {
    const scale = getProjectState('scale')
    if (!elements?.length) return null;
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
                <Text text={'Frame'} y={-16 / scale} fontSize={14 / scale} fill={'gray'} />
                <Rect
                    x={0}
                    y={0}
                    width={element.width}
                    height={element.height}
                    fill={element.fill}
                />
                <Render elements={element.elements} />
            </Group>
        }
    })
}