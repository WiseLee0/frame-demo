import { Group, Rect, Text, Image, Ellipse, Shape } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
import { useState, useEffect, useRef } from "react";
import imageURL from './assets/image.jpeg?url'
import React from "react";
import Konva from "konva";

export function RenderElements() {
    const canvaskit = useProjectState('canvaskit')
    const elements = useProjectState('elements')
    useSelectionBoxState('renderDep')
    if (!canvaskit) return null
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

const ShadowWrapper = ({ element, children }: { element: any; children: React.ReactNode }) => {
    const canvaskit = getProjectState('canvaskit')
    const [shadowData, setShadowData] = useState<{
        image: any,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number
    }[]>([]);
    const shadowsRef = useRef<EffectItem[]>([]);

    const shadows = (element?.effects as EffectItem[])?.filter(item =>
        (item.type === 'DROP_SHADOW' || item.type === 'INNER_SHADOW') && item.visible
    ) || [];

    const dropShadows = shadows.filter(s => s.type === 'DROP_SHADOW');


    // 使用CanvasKit生成阴影，直接使用Image对象
    const generateShadowImagesWithCanvasKit = async () => {
        if (!canvaskit || !dropShadows.length) {
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
            const blurRadius = shadow.radius
            // 计算canvas尺寸
            const canvasWidth = element.width + blurRadius * 2;
            const canvasHeight = element.height + blurRadius * 2;

            // 创建CanvasKit Surface
            const surface = canvaskit.MakeSurface(canvasWidth, canvasHeight);
            if (!surface) continue;

            const canvas = surface.getCanvas();

            // 创建画笔
            const paint = new canvaskit.Paint();

            // 设置阴影颜色
            const shadowColor = canvaskit.Color(
                shadow.color.r * 255,
                shadow.color.g * 255,
                shadow.color.b * 255,
                shadow.color.a
            );

            // 创建模糊滤镜
            const blurFilter = canvaskit.ImageFilter.MakeBlur(
                shadow.radius / 2,
                shadow.radius / 2,
                canvaskit.TileMode.Decal,
                null
            );
            paint.setImageFilter(blurFilter);
            paint.setColor(shadowColor);

            // 计算绘制位置（包含阴影偏移）
            const drawX = blurRadius;
            const drawY = blurRadius;

            // 创建形状路径
            const path = new canvaskit.Path();

            if (element.type === 'shape_square') {
                const rect = canvaskit.XYWHRect(drawX, drawY, element.width, element.height);
                path.addRect(rect);
            }

            // 绘制带模糊的阴影形状
            canvas.drawPath(path, paint);
            surface.flush();

            // 使用 CanvasKit 的 makeImageSnapshot 方法获取图像
            const imageSnapshot = surface.makeImageSnapshot();
            if (!imageSnapshot) continue;

            // 将 CanvasKit Image 转换为可用的图像格式
            const imageData = imageSnapshot.encodeToBytes();
            if (!imageData) {
                imageSnapshot.delete();
                continue;
            }
            const blob = new Blob([imageData], { type: 'image/png' });
            const imageBitMap = await createImageBitmap(blob);

            // 存储阴影数据
            shadowDataList.push({
                image: imageBitMap,
                offsetX: -blurRadius + shadow.offset.x,
                offsetY: -blurRadius + shadow.offset.y,
                width: canvasWidth,
                height: canvasHeight
            });

            // 清理CanvasKit对象
            imageSnapshot.delete(); // 添加清理 imageSnapshot
            path.delete();
            paint.delete();
            blurFilter.delete();
            surface.delete();
        }

        setShadowData(shadowDataList);
    };

    // 当阴影配置改变时重新生成阴影图片
    useEffect(() => {
        const shadowsString = JSON.stringify(dropShadows);
        const prevShadowsString = JSON.stringify(shadowsRef.current);

        if (shadowsString !== prevShadowsString) {
            shadowsRef.current = dropShadows;
            generateShadowImagesWithCanvasKit();
        }
    }, [canvaskit, JSON.stringify(dropShadows), element.width, element.height, element.scaleX, element.scaleY]);


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
}