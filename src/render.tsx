import { Group, Rect, Text, Image, Ellipse } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
import { useState, useEffect, useRef } from "react";
import imageURL from './assets/image.jpeg?url'
import React from "react";
import { generateShadowWithWebGL } from "./shadow";

export function RenderElements() {
    const elements = useProjectState('elements')
    useSelectionBoxState('renderDep')
    return <Render elements={elements} />
}

function Render({ elements }: { elements: any[] }) {
    const scale = getProjectState('scale')
    return elements.map(element => {
        if (element.type === "shape_square") {
            return <ShadowWrapper element={element}>
                <Rect
                    key={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    rotation={element.rotation}
                    fill={element.data.backgroundColor}
                />
            </ShadowWrapper>
        }
        if (element.type === "shape_circle") {
            return <ShadowWrapper element={element}>
                <Ellipse
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
            </ShadowWrapper>
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

type EffectItem = {
    type: string,
    offset: { x: number, y: number },
    radius: number,                        // 模糊值
    visible: boolean,
    blendMode: string,
    spread: number,
    showShadowBehindNode: boolean,        // 展示背景阴影
    color: { r: number, g: number, b: number, a: number }
}


const ShadowWrapper = React.memo(({ element, children }: { element: any; children: React.ReactNode }) => {
    const [shadowData, setShadowData] = useState<{
        image: any,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number
    }[]>([]);
    const shadows = (element?.effects as EffectItem[])?.filter(item =>
        (item.type === 'DROP_SHADOW' || item.type === 'INNER_SHADOW') && item.visible
    ) || [];

    const dropShadows = shadows.filter(s => s.type === 'DROP_SHADOW');

    const generateShadowImagesWithWebGL = async () => {
        if (!dropShadows.length) {
            setShadowData([]);
            return;
        }

        const shadowDataList: {
            image: any,
            offsetX: number,
            offsetY: number,
            width: number,
            height: number
        }[] = [];

        for (const shadow of dropShadows) {
            try {
                const blurRadius = shadow.radius;
                const padding = Math.ceil(blurRadius * 2);
                const canvasWidth = element.width;
                const canvasHeight = element.height;
                // 创建形状纹理
                const shapeCanvas = document.createElement('canvas');
                shapeCanvas.width = canvasWidth + padding;
                shapeCanvas.height = canvasHeight + padding;
                const shapeCtx = shapeCanvas.getContext('2d')!;

                shapeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                shapeCtx.fillStyle = `rgba(${shadow.color.r * 255}, ${shadow.color.g * 255}, ${shadow.color.b * 255}, ${shadow.color.a})`;

                if (element.type === 'shape_square') {
                    shapeCtx.translate(padding / 2, padding / 2);
                    shapeCtx.fillRect(0, 0, element.width, element.height);
                }
                // 创建ImageBitmap

                const imageBitMap = await generateShadowWithWebGL(blurRadius, shapeCanvas)

                shadowDataList.push({
                    image: imageBitMap,
                    offsetX: -blurRadius + shadow.offset.x,
                    offsetY: -blurRadius + shadow.offset.y,
                    width: canvasWidth + blurRadius * 2,
                    height: canvasHeight + blurRadius * 2
                });

            } catch (error) {
                console.error('Error generating shadow:', error);
            }
        }

        setShadowData(shadowDataList);
    };


    useEffect(() => {
        generateShadowImagesWithWebGL();
    }, [element.width, element.height]);

    if (!dropShadows.length) {
        return <>{children}</>;
    }

    return (
        <Group>
            {/* 渲染阴影图片 */}
            {shadowData.map((shadow, index) => (
                <Image
                    key={`shadow-${index}`}
                    image={shadow.image}
                    x={(children as any)?.props.x + shadow.offsetX}
                    y={(children as any)?.props.y + shadow.offsetY}
                    width={shadow.width}
                    height={shadow.height}
                    listening={false}
                />
            ))}

            {/* 渲染原始元素 */}
            {children}
        </Group>
    );
});

ShadowWrapper.displayName = 'ShadowWrapper';