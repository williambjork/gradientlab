import { hexToRgb, rasterizeStops } from './palette'
import type { GradientScene } from './scene'
import { MAX_LAYERS, fragmentShader, vertexShader } from './shader'
import type { GradientPreset } from './types'

const PALETTE_WIDTH = 512
/** Inner ring radius, outer ring radius (CSS px), then per-tap weights for each ring */
const BLUR: [number, number, number, number] = [64, 199, 3.75, 0.76]
/** How far along the centre-to-edge line a pivot sits; just inside the visible edge */
const PIVOT_INSET = 0.96

const UNIFORMS = [
  'uCanvasSize', 'uViewOrigin', 'uViewSpan',
  'uLayerCount', 'uCenter', 'uRadii', 'uAngle', 'uTurn', 'uPivot', 'uScale', 'uOpacity', 'uPalette', 'uBackground',
  'uPointer', 'uPull', 'uPullRadius', 'uBlur',
] as const

type UniformName = (typeof UNIFORMS)[number]

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed')
  }
  return shader
}

/** Draws a GradientScene into a canvas at half CSS resolution. Owns the frame loop. */
export class GradientRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly uniforms = {} as Record<UniformName, WebGLUniformLocation | null>
  private palette: WebGLTexture | null = null
  private contextLost = false
  private readonly centers = new Float32Array(MAX_LAYERS * 2)
  private readonly radii = new Float32Array(MAX_LAYERS * 2)
  private readonly angles = new Float32Array(MAX_LAYERS)
  private readonly turns = new Float32Array(MAX_LAYERS)
  private readonly pivots = new Float32Array(MAX_LAYERS * 2)
  private readonly scales = new Float32Array(MAX_LAYERS)
  private readonly opacities = new Float32Array(MAX_LAYERS)

  private raf = 0
  private lastTime = 0
  private visible = true
  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver

  private readonly canvas: HTMLCanvasElement
  private readonly scene: GradientScene
  private readonly background: string

  constructor(canvas: HTMLCanvasElement, scene: GradientScene, background: string) {
    this.canvas = canvas
    this.scene = scene
    this.background = background
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false })
    if (!gl) throw new Error('WebGL2 is not supported')
    this.gl = gl

    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    this.initGL()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting
    })
    this.intersectionObserver.observe(canvas)
    this.resize()

    this.raf = requestAnimationFrame(this.frame)
  }

  private initGL() {
    const gl = this.gl
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
    }
    gl.useProgram(program)
    gl.bindVertexArray(gl.createVertexArray())
    for (const name of UNIFORMS) this.uniforms[name] = gl.getUniformLocation(program, name)

    this.palette = gl.createTexture()!
    this.setPalettes(this.scene.layers.map((l) => l.preset))

    const [r, g, b] = hexToRgb(this.background)
    gl.uniform3f(this.uniforms.uBackground, r / 255, g / 255, b / 255)
    gl.uniform1i(this.uniforms.uPalette, 0)
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.contextLost = true
  }

  private onContextRestored = () => {
    this.initGL()
    this.contextLost = false
  }

  /** Re-uploads palette rows; call when preset stops change. */
  setPalettes(presets: GradientPreset[]) {
    const gl = this.gl
    const data = new Float32Array(PALETTE_WIDTH * MAX_LAYERS * 4)
    presets.slice(0, MAX_LAYERS).forEach((p, i) => rasterizeStops(p.stops, PALETTE_WIDTH, data, i * PALETTE_WIDTH * 4))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.palette)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, PALETTE_WIDTH, MAX_LAYERS, 0, gl.RGBA, gl.FLOAT, data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  private resize() {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    // Deliberately half CSS size and ignoring devicePixelRatio; the field has no sharp detail.
    this.canvas.width = Math.max(1, Math.floor(width / 2))
    this.canvas.height = Math.max(1, Math.floor(height / 2))
    this.scene.setViewport(width, height)
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.1) : 0
    this.lastTime = now
    this.scene.update(now, dt)
    if (this.visible && !this.contextLost) this.draw()
  }

  private draw() {
    const { gl, scene, uniforms: u } = this
    const [driftX, driftY] = scene.fieldDrift
    const count = Math.min(scene.layers.length, MAX_LAYERS)
    const { originX, originY, spanX, spanY } = scene.view
    const midX = originX + spanX / 2
    const midY = originY + spanY / 2

    for (let i = 0; i < count; i++) {
      const { preset, opacity, rotation, scale, shift, tangent } = scene.layers[i]
      const cx = preset.center[0] + tangent[0] * shift.value + driftX
      const cy = preset.center[1] + tangent[1] * shift.value + driftY
      this.centers[i * 2] = cx
      this.centers[i * 2 + 1] = cy

      // Lights sit off-screen; turning them around the nearest visible edge point makes the
      // band swing across the view instead of drifting.
      const dx = cx - midX
      const dy = cy - midY
      const reach = Math.min(
        dx ? spanX / 2 / Math.abs(dx) : Infinity,
        dy ? spanY / 2 / Math.abs(dy) : Infinity,
      )
      const t = Math.min(1, reach * PIVOT_INSET)
      this.pivots[i * 2] = midX + dx * t
      this.pivots[i * 2 + 1] = midY + dy * t

      this.radii[i * 2] = preset.radii[0]
      this.radii[i * 2 + 1] = preset.radii[1]
      this.angles[i] = (preset.rotation * Math.PI) / 180
      this.turns[i] = (rotation.value * Math.PI) / 180
      this.scales[i] = scale.value
      this.opacities[i] = Math.min(Math.max(opacity.value, 0), 1)
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.uniform2f(u.uCanvasSize, this.canvas.width, this.canvas.height)
    gl.uniform2f(u.uViewOrigin, scene.view.originX, scene.view.originY)
    gl.uniform2f(u.uViewSpan, scene.view.spanX, scene.view.spanY)
    gl.uniform1i(u.uLayerCount, count)
    gl.uniform2fv(u.uCenter, this.centers)
    gl.uniform2fv(u.uRadii, this.radii)
    gl.uniform1fv(u.uAngle, this.angles)
    gl.uniform1fv(u.uTurn, this.turns)
    gl.uniform2fv(u.uPivot, this.pivots)
    gl.uniform1fv(u.uScale, this.scales)
    gl.uniform1fv(u.uOpacity, this.opacities)
    gl.uniform2f(u.uPointer, scene.pointerX.value, scene.pointerY.value)
    gl.uniform1f(u.uPull, Math.max(scene.pull.value, 0))
    gl.uniform1f(u.uPullRadius, Math.max(scene.pullRadius.value, 1))
    gl.uniform4f(u.uBlur, BLUR[0] * scene.view.scale, BLUR[1] * scene.view.scale, BLUR[2], BLUR[3])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
