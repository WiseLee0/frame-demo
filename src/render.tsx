import { Group, Rect, Text, Image, Ellipse } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
import { useState, useEffect } from "react";
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
    const [shadowData, setShadowData] = useState<any[]>([]);
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
            image: any;
            offsetX: number;
            offsetY: number;
            width: number;
            height: number;
            scale: number;
        }[] = [];

        for (const shadow of dropShadows) {
            try {
                const blurRadius = shadow.radius;
                const padding = Math.ceil(blurRadius * 2);
                const canvasWidth = element.width;
                const canvasHeight = element.height;

                // 归一化目标尺寸（固定512x512）
                const TARGET_SIZE = 512;
                // 原始阴影区域大小
                const shadowAreaWidth = canvasWidth + padding;
                const shadowAreaHeight = canvasHeight + padding;
                // 计算缩放比例（保持宽高比，确保阴影区域不超过512x512）
                const scale = Math.min(
                    TARGET_SIZE / shadowAreaWidth,
                    TARGET_SIZE / shadowAreaHeight
                );

                // 关键：计算形状左上角在原始坐标空间中的位置（相对于阴影图片的左上角）
                const xShapeOriginal = (TARGET_SIZE / (2 * scale)) - canvasWidth / 2;
                const yShapeOriginal = (TARGET_SIZE / (2 * scale)) - canvasHeight / 2;

                // 计算补偿后的偏移量（抵消居中绘制的影响）
                // 公式：offsetX = 阴影偏移x - 形状左上角相对于阴影图片的位置
                const offsetX = shadow.offset.x - xShapeOriginal;
                const offsetY = shadow.offset.y - yShapeOriginal;

                // 创建归一化画布
                const shapeCanvas = document.createElement('canvas');
                shapeCanvas.width = TARGET_SIZE;
                shapeCanvas.height = TARGET_SIZE;
                const shapeCtx = shapeCanvas.getContext('2d')!;
                shapeCtx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

                // 居中绘制形状（归一化画布）
                shapeCtx.save();
                // 1. 平移原点到画布中心
                shapeCtx.translate(TARGET_SIZE / 2, TARGET_SIZE / 2);
                // 2. 缩放到归一化比例
                shapeCtx.scale(scale, scale);
                // 3. 平移回元素左上角
                shapeCtx.translate(-canvasWidth / 2, -canvasHeight / 2);

                // 绘制形状（原始尺寸，会被缩放）
                shapeCtx.fillStyle = `rgba(${shadow.color.r * 255}, ${shadow.color.g * 255}, ${shadow.color.b * 255}, ${shadow.color.a})`;
                if (element.type === 'shape_square') {
                    shapeCtx.fillRect(0, 0, canvasWidth, canvasHeight); // 原始尺寸的矩形
                }

                // 计算归一化后的模糊半径
                const normalizedBlur = blurRadius * scale;
                // 调用WebGL模糊函数
                const imageBitMap = await generateShadowWithWebGL(normalizedBlur, shapeCanvas, [1, 0, 1, 1]);
                if (!shadow.showShadowBehindNode) {
                    // 清空画布
                    shapeCtx.clearRect(-padding, -padding, TARGET_SIZE / scale + padding, TARGET_SIZE / scale + padding)
                    // 绘制遮照区域
                    shapeCtx.fillStyle = 'black';
                    const dx = -shadow.offset.x;
                    const dy = -shadow.offset.y;
                    const dw = element.width;
                    const dh = element.height;
                    shapeCtx.fillRect(dx, dy, dw, dh);
                    // 只显示新图形不与现有内容重叠的部分
                    shapeCtx.globalCompositeOperation = 'source-out';
                    shapeCtx.drawImage(imageBitMap, -xShapeOriginal, -yShapeOriginal, TARGET_SIZE / scale, TARGET_SIZE / scale)
                    shadowDataList.push({
                        image: shapeCanvas,
                        offsetX: offsetX,
                        offsetY: offsetY,
                        width: TARGET_SIZE,
                        height: TARGET_SIZE,
                        scale: scale
                    });
                } else {
                    shadowDataList.push({
                        image: imageBitMap,
                        offsetX: offsetX,
                        offsetY: offsetY,
                        width: TARGET_SIZE,
                        height: TARGET_SIZE,
                        scale: scale
                    });
                }
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
                    scale={{ x: 1 / shadow.scale, y: 1 / shadow.scale }}
                    listening={false}
                />
            ))}

            {/* 渲染原始元素 */}
            {children}
        </Group>
    );
});

ShadowWrapper.displayName = 'ShadowWrapper';