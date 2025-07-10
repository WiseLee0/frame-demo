import { Group, Rect, Text, Image, Ellipse } from "react-konva";
import { getProjectState, useProjectState } from "./projectState";
import { useSelectionBoxState } from "./selection-box";
import { useState, useEffect, useRef } from "react";
import imageURL from './assets/image.jpeg?url'
import React from "react";

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

// 全局 WebGL 资源管理器
class WebGLResourceManager {
    private static instance: WebGLResourceManager;
    private resources: {
        canvas: HTMLCanvasElement | null;
        gl: WebGLRenderingContext | null;
        blurProgram: WebGLProgram | null;
        outputProgram: WebGLProgram | null;
        positionBuffer: WebGLBuffer | null;
        texCoordBuffer: WebGLBuffer | null;
        framebuffer: WebGLFramebuffer | null;
        blurAttributeLocations: Map<string, number>;
        blurUniformLocations: Map<string, WebGLUniformLocation | null>;
        outputAttributeLocations: Map<string, number>;
        outputUniformLocations: Map<string, WebGLUniformLocation | null>;
    } = {
            canvas: null,
            gl: null,
            blurProgram: null,
            outputProgram: null,
            positionBuffer: null,
            texCoordBuffer: null,
            framebuffer: null,
            blurAttributeLocations: new Map(),
            blurUniformLocations: new Map(),
            outputAttributeLocations: new Map(),
            outputUniformLocations: new Map()
        };

    static getInstance(): WebGLResourceManager {
        if (!WebGLResourceManager.instance) {
            WebGLResourceManager.instance = new WebGLResourceManager();
        }
        return WebGLResourceManager.instance;
    }

    getResources() {
        return this.resources;
    }

    initializeResources(): WebGLRenderingContext | null {
        if (this.resources.gl) {
            return this.resources.gl;
        }

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');

        if (!gl) {
            console.warn('WebGL not supported');
            return null;
        }

        // 通用顶点着色器
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // 模糊片段着色器
        const blurFragmentShader = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
const float count = 16.0;
uniform vec2 u_blurDelta;

void main() {
    float weight = count;
    vec4 result = texture2D(u_texture, v_texCoord) * weight;
    float total = weight;
    for(int i = 1; i < 64; i += 2) {
        if(float(i) > count) {
            break;
        }
        float t0 = float(i);
        float t1 = min(t0 + 1.0, count);
        vec2 coord0_neg = v_texCoord - u_blurDelta * t0;
        vec2 coord0_pos = v_texCoord + u_blurDelta * t0;
        vec2 coord1_neg = v_texCoord - u_blurDelta * t1;
        vec2 coord1_pos = v_texCoord + u_blurDelta * t1;

        float weight0 = count - t0;
        float weight1 = count - t1;
        float weightSum = weight0 + weight1;

        vec2 coord_neg = (coord0_neg * weight0 + coord1_neg * weight1) / weightSum;
        vec2 coord_pos = (coord0_pos * weight0 + coord1_pos * weight1) / weightSum;

        result += weightSum * (texture2D(u_texture, coord_neg) + texture2D(u_texture, coord_pos));
        total += 2.0 * weightSum;
    }

    gl_FragColor = result / total;
}
        `;

        // 简单输出片段着色器
        const outputFragmentShader = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;

void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
}
        `;

        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const createProgram = (vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
            const program = gl.createProgram();
            if (!program) return null;

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program link error:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }
            return program;
        };

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const blurFragmentShaderObj = createShader(gl.FRAGMENT_SHADER, blurFragmentShader);
        const outputFragmentShaderObj = createShader(gl.FRAGMENT_SHADER, outputFragmentShader);

        if (!vertexShader || !blurFragmentShaderObj || !outputFragmentShaderObj) {
            console.error('Failed to create shaders');
            return null;
        }

        const blurProgram = createProgram(vertexShader, blurFragmentShaderObj);
        const outputProgram = createProgram(vertexShader, outputFragmentShaderObj);

        if (!blurProgram || !outputProgram) {
            console.error('Failed to create programs');
            return null;
        }

        // 创建缓冲区
        const positions = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);

        const texCoords = new Float32Array([
            0, 0, 1, 0, 0, 1,
            0, 1, 1, 0, 1, 1
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        const framebuffer = gl.createFramebuffer();

        // 缓存模糊程序的属性和Uniform位置
        this.resources.blurAttributeLocations.set('a_position', gl.getAttribLocation(blurProgram, 'a_position'));
        this.resources.blurAttributeLocations.set('a_texCoord', gl.getAttribLocation(blurProgram, 'a_texCoord'));
        this.resources.blurUniformLocations.set('u_texture', gl.getUniformLocation(blurProgram, 'u_texture'));
        this.resources.blurUniformLocations.set('u_blurDelta', gl.getUniformLocation(blurProgram, 'u_blurDelta'));

        // 缓存输出程序的属性和Uniform位置
        this.resources.outputAttributeLocations.set('a_position', gl.getAttribLocation(outputProgram, 'a_position'));
        this.resources.outputAttributeLocations.set('a_texCoord', gl.getAttribLocation(outputProgram, 'a_texCoord'));
        this.resources.outputUniformLocations.set('u_texture', gl.getUniformLocation(outputProgram, 'u_texture'));

        // 清理着色器对象
        gl.deleteShader(vertexShader);
        gl.deleteShader(blurFragmentShaderObj);
        gl.deleteShader(outputFragmentShaderObj);

        // 保存资源
        this.resources.canvas = canvas;
        this.resources.gl = gl;
        this.resources.blurProgram = blurProgram;
        this.resources.outputProgram = outputProgram;
        this.resources.positionBuffer = positionBuffer;
        this.resources.texCoordBuffer = texCoordBuffer;
        this.resources.framebuffer = framebuffer;

        return gl;
    }
}

const ShadowWrapper = React.memo(({ element, children }: { element: any; children: React.ReactNode }) => {
    const [shadowData, setShadowData] = useState<{
        image: any,
        offsetX: number,
        offsetY: number,
        width: number,
        height: number
    }[]>([]);

    const webglManagerRef = useRef(WebGLResourceManager.getInstance());

    // 优化：使用 useMemo 来缓存阴影计算
    const shadows = (element?.effects as EffectItem[])?.filter(item =>
        (item.type === 'DROP_SHADOW' || item.type === 'INNER_SHADOW') && item.visible
    ) || [];

    const dropShadows = shadows.filter(s => s.type === 'DROP_SHADOW');

    // 优化：使用 useCallback 避免函数重新创建
    const generateShadowImagesWithWebGL = async () => {
        if (!dropShadows.length) {
            setShadowData([]);
            return;
        }

        const gl = webglManagerRef.current.initializeResources();
        if (!gl) return;

        const resources = webglManagerRef.current.getResources();
        const canvas = resources.canvas!;

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
                const canvasWidth = element.width + blurRadius * 2;
                const canvasHeight = element.height + blurRadius * 2;
                // 只在需要时调整 canvas 尺寸
                if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                }

                // 创建形状纹理
                const shapeCanvas = document.createElement('canvas');
                shapeCanvas.width = canvasWidth;
                shapeCanvas.height = canvasHeight;
                const shapeCtx = shapeCanvas.getContext('2d')!;

                shapeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                shapeCtx.fillStyle = `rgba(${shadow.color.r * 255}, ${shadow.color.g * 255}, ${shadow.color.b * 255}, ${shadow.color.a})`;
                const drawX = blurRadius;
                const drawY = blurRadius;

                if (element.type === 'shape_square') {
                    shapeCtx.fillRect(drawX, drawY, element.width, element.height);
                } else if (element.type === 'shape_circle') {
                    shapeCtx.beginPath();
                    shapeCtx.ellipse(
                        drawX + element.width / 2,
                        drawY + element.height / 2,
                        element.width / 2,
                        element.height / 2,
                        0, 0, Math.PI * 2
                    );
                    shapeCtx.fill();
                }

                // 创建输入纹理
                const inputTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, inputTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, shapeCanvas);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // 创建中间纹理
                const intermediateTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, intermediateTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // 创建输出纹理
                const outputTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, outputTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // 设置帧缓冲 - 第一步水平模糊
                gl.bindFramebuffer(gl.FRAMEBUFFER, resources.framebuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, intermediateTexture, 0);

                // 设置 WebGL 状态
                gl.clearColor(0, 0, 0, 0);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.viewport(0, 0, canvasWidth, canvasHeight);

                // 第一步：水平模糊
                gl.useProgram(resources.blurProgram);
                gl.clear(gl.COLOR_BUFFER_BIT);

                const uPosLocation = resources.blurAttributeLocations.get('a_position')!;
                const uTexCoordLocation = resources.blurAttributeLocations.get('a_texCoord')!;

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.positionBuffer);
                gl.enableVertexAttribArray(uPosLocation);
                gl.vertexAttribPointer(uPosLocation, 2, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.texCoordBuffer);
                gl.enableVertexAttribArray(uTexCoordLocation);
                gl.vertexAttribPointer(uTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, inputTexture);
                gl.uniform1i(resources.blurUniformLocations.get('u_texture')!, 0);

                // 设置水平模糊参数
                gl.uniform2f(resources.blurUniformLocations.get('u_blurDelta')!, 0.002, 0.0);

                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // 第二步：垂直模糊 - 绑定到输出纹理
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.positionBuffer);
                gl.enableVertexAttribArray(uPosLocation);
                gl.vertexAttribPointer(uPosLocation, 2, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.texCoordBuffer);
                gl.enableVertexAttribArray(uTexCoordLocation);
                gl.vertexAttribPointer(uTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, intermediateTexture);
                gl.uniform1i(resources.blurUniformLocations.get('u_texture')!, 0);

                // 设置垂直模糊参数
                gl.uniform2f(resources.blurUniformLocations.get('u_blurDelta')!, 0.0, 0.002);

                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // 将结果绘制到主画布
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.clear(gl.COLOR_BUFFER_BIT);

                // 使用输出shader程序
                gl.useProgram(resources.outputProgram);

                const outputPosLocation = resources.outputAttributeLocations.get('a_position')!;
                const outputTexCoordLocation = resources.outputAttributeLocations.get('a_texCoord')!;

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.positionBuffer);
                gl.enableVertexAttribArray(outputPosLocation);
                gl.vertexAttribPointer(outputPosLocation, 2, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, resources.texCoordBuffer);
                gl.enableVertexAttribArray(outputTexCoordLocation);
                gl.vertexAttribPointer(outputTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, outputTexture);
                gl.uniform1i(resources.outputUniformLocations.get('u_texture')!, 0);

                // 直接渲染，不需要设置模糊参数
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // 创建ImageBitmap
                const imageBitMap = await createImageBitmap(canvas);

                shadowDataList.push({
                    image: imageBitMap,
                    offsetX: -blurRadius + shadow.offset.x,
                    offsetY: -blurRadius + shadow.offset.y,
                    width: canvasWidth,
                    height: canvasHeight
                });

                // 清理纹理
                gl.deleteTexture(inputTexture);
                gl.deleteTexture(intermediateTexture);
                gl.deleteTexture(outputTexture);

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