// 创建WebGL程序和纹理的工具函数
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(`着色器编译错误：${error}`)
    }
    return shader
}

function createProgram(gl: WebGL2RenderingContext, vertShader: WebGLShader, fragShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram()!
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error(`程序链接错误：${error}`)
    }
    return program
}

function createTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    return texture
}

function createFramebuffer(gl: WebGL2RenderingContext, texture: WebGLTexture): WebGLFramebuffer {
    const framebuffer = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(framebuffer)
        throw new Error('帧缓冲区创建失败')
    }

    return framebuffer
}

// 着色器源码常量
const BLUR_VERTEX_SHADER = `#version 300 es
  uniform vec4 quad;
  in vec2 position2;
  out vec2 _coord2;
  void main() {
      _coord2 = mix(quad.xy, quad.zw, position2);
      gl_Position = vec4(_coord2 * 2.0 - 1.0, 0, 1);
  }`

const BLUR_FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  const int maxRadiusInTexelsForBlurs = 250;
  uniform int increaseMaxRadiusForBlurs;
  uniform float count;
  uniform vec2 blurDelta;
  uniform sampler2D texture0;
  in vec2 _coord2;
  out vec4 fig_FragColor;
  void main() {
      float weight = count;
      vec4 result = texture(texture0, _coord2) * weight;
      float total = weight;
      for (int i = 1; i < maxRadiusInTexelsForBlurs; i += 2) {
          if (!bool(increaseMaxRadiusForBlurs)) {
              if (i >= 32) {
                  break;
              }
          }
          if (float(i) > count) {
              break;
          }
          float t0 = float(i);
          float t1 = min(t0 + 1.0, count);
          vec2 coord0_neg = _coord2 - blurDelta * t0;
          vec2 coord0_pos = _coord2 + blurDelta * t0;
          vec2 coord1_neg = _coord2 - blurDelta * t1;
          vec2 coord1_pos = _coord2 + blurDelta * t1;
          float weight0 = count - t0;
          float weight1 = count - t1;
          float weightSum = weight0 + weight1;
          vec2 coord_neg = (coord0_neg * weight0 + coord1_neg * weight1) / weightSum;
          vec2 coord_pos = (coord0_pos * weight0 + coord1_pos * weight1) / weightSum;
          result += weightSum * (texture(texture0, coord_neg) + texture(texture0, coord_pos));
          total += 2.0 * weightSum;
      }
      fig_FragColor = result / total;
  }`

// WebGL上下文管理器
class WebGLContextManager {
    private static instance: WebGLContextManager | null = null
    private canvas: HTMLCanvasElement | null = null
    private gl: WebGL2RenderingContext | null = null
    private program: WebGLProgram | null = null
    private vertexBuffer: WebGLBuffer | null = null
    private uniforms: {
        quad: WebGLUniformLocation | null
        count: WebGLUniformLocation | null
        blurDelta: WebGLUniformLocation | null
        increaseMax: WebGLUniformLocation | null
        texture: WebGLUniformLocation | null
    } | null = null
    private positionAttribute: number = -1

    static getInstance(): WebGLContextManager {
        if (!WebGLContextManager.instance) {
            WebGLContextManager.instance = new WebGLContextManager()
        }
        return WebGLContextManager.instance
    }

    private constructor() { }

    private initializeWebGL(): void {
        if (this.gl) return

        this.canvas = document.createElement('canvas')

        // 获取WebGL2上下文
        this.gl = this.canvas.getContext('webgl2', {
            preserveDrawingBuffer: true,
            antialias: false,
            alpha: true,
            premultipliedAlpha: true
        })

        if (!this.gl) {
            throw new Error('WebGL2不支持')
        }

        // 创建着色器程序
        const vertShader = createShader(this.gl, this.gl.VERTEX_SHADER, BLUR_VERTEX_SHADER)
        const fragShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, BLUR_FRAGMENT_SHADER)
        this.program = createProgram(this.gl, vertShader, fragShader)

        // 清理着色器（程序已经链接了）
        this.gl.deleteShader(vertShader)
        this.gl.deleteShader(fragShader)

        // 获取uniform和attribute位置
        this.positionAttribute = this.gl.getAttribLocation(this.program, 'position2')
        this.uniforms = {
            quad: this.gl.getUniformLocation(this.program, 'quad'),
            count: this.gl.getUniformLocation(this.program, 'count'),
            blurDelta: this.gl.getUniformLocation(this.program, 'blurDelta'),
            increaseMax: this.gl.getUniformLocation(this.program, 'increaseMaxRadiusForBlurs'),
            texture: this.gl.getUniformLocation(this.program, 'texture0')
        }

        // 创建顶点缓冲区（全屏四边形）
        const vertices = new Float32Array([
            0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
            0.0, 1.0, 1.0, 0.0, 1.0, 1.0
        ])

        this.vertexBuffer = this.gl.createBuffer()!
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW)

        // 设置顶点属性
        this.gl.enableVertexAttribArray(this.positionAttribute)
        this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 0, 0)
    }

    generateShadow(blur: number, shapeCanvas: HTMLCanvasElement): Promise<ImageBitmap> {
        if (blur <= 0) {
            throw new Error('模糊半径必须大于0')
        }

        this.initializeWebGL()

        const gl = this.gl!
        const canvas = this.canvas!
        const program = this.program!
        const uniforms = this.uniforms!

        const width = shapeCanvas.width
        const height = shapeCanvas.height

        // 调整canvas大小
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)

        // 使用程序
        gl.useProgram(program)

        let initialTexture: WebGLTexture | null = null
        let horizTexture: WebGLTexture | null = null
        let horizFramebuffer: WebGLFramebuffer | null = null

        try {
            // 创建初始纹理
            initialTexture = createTexture(gl, width, height)
            gl.bindTexture(gl.TEXTURE_2D, initialTexture)

            // 上传纹理数据
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, shapeCanvas)

            // 创建中间纹理和帧缓冲区
            horizTexture = createTexture(gl, width, height)
            horizFramebuffer = createFramebuffer(gl, horizTexture)

            // 设置通用uniform
            gl.uniform4f(uniforms.quad!, 0, 0, 1, 1)
            gl.uniform1f(uniforms.count!, blur)
            gl.uniform1i(uniforms.increaseMax!, blur > 32 ? 1 : 0)
            gl.uniform1i(uniforms.texture!, 0)

            // 第一步：水平模糊
            gl.bindFramebuffer(gl.FRAMEBUFFER, horizFramebuffer)
            gl.uniform2f(uniforms.blurDelta!, 1.0 / width, 0.0)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, initialTexture)
            gl.drawArrays(gl.TRIANGLES, 0, 6)

            // 第二步：垂直模糊（直接渲染到画布）
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.uniform2f(uniforms.blurDelta!, 0.0, 1.0 / height)

            gl.bindTexture(gl.TEXTURE_2D, horizTexture)
            gl.drawArrays(gl.TRIANGLES, 0, 6)

            // 创建ImageBitmap并返回
            return createImageBitmap(canvas)

        } catch (error) {
            throw new Error(`WebGL阴影生成失败: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            // 清理临时资源
            if (initialTexture) gl.deleteTexture(initialTexture)
            if (horizTexture) gl.deleteTexture(horizTexture)
            if (horizFramebuffer) gl.deleteFramebuffer(horizFramebuffer)
        }
    }

    // 销毁WebGL上下文（可选，用于释放资源）
    destroy(): void {
        if (this.gl) {
            if (this.program) this.gl.deleteProgram(this.program)
            if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer)

            // 强制丢失上下文
            const loseContext = this.gl.getExtension('WEBGL_lose_context')
            if (loseContext) {
                loseContext.loseContext()
            }
        }

        this.canvas = null
        this.gl = null
        this.program = null
        this.vertexBuffer = null
        this.uniforms = null
        this.positionAttribute = -1

        WebGLContextManager.instance = null
    }
}

export async function generateShadowWithWebGL(blur: number, shapeCanvas: HTMLCanvasElement): Promise<ImageBitmap> {
    const manager = WebGLContextManager.getInstance()
    return manager.generateShadow(blur, shapeCanvas)
}

// 可选：提供清理函数用于释放WebGL资源
export function destroyShadowWebGLContext(): void {
    const manager = WebGLContextManager.getInstance()
    manager.destroy()
}