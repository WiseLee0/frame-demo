import { Group, Rect, Text, Image, Ellipse } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
import { useState, useEffect } from "react";
import imageURL from './assets/image.jpeg?url'
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
        if (element.type === "shape_circle") {
            return <Ellipse
                key={element.id}
                x={element.x}
                y={element.y}
                rotation={element.rotation}
                width={element.width * element.scaleX}
                height={element.height * element.scaleY}
                radiusX={(element.width * element.scaleX) / 2}
                radiusY={(element.height * element.scaleY) / 2}
                offsetX={-(element.width * element.scaleX) / 2}
                offsetY={-(element.height * element.scaleY) / 2}
                scaleX={element.scaleX}
                scaleY={element.scaleY}
                fill={element.data.backgroundColor}
            />
        }
        if (element.type === 'image') {
            return <ImageComponent element={element} />
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

const ImageComponent = ({ element }: any) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        fetch(imageURL).then(res => res.blob()).then(blob => {
            const img = new window.Image(); // 或者 new Image() 如果是在浏览器环境
            img.src = URL.createObjectURL(blob);
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                setImage(img);
            };
        });
    }, [element]);

    if (!image) return null

    return (
        <Group x={element.x} y={element.y} scaleX={element.scaleX} scaleY={element.scaleY} rotation={element.rotation}>
            <Image
                image={image}
                x={0}
                y={0}
                width={element.width}
                height={element.height}
            />
        </Group>
    );
};