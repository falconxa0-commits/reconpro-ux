"use client";

import {
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";

// ── Props ──────────────────────────────────────────────
export interface ObsidianShaderProps {
  /** Render the shader (default: true) */
  active?: boolean;
  /** Multiplier for animation speed (0 = frozen, 1 = normal, 2 = fast) */
  speed?: number;
  /** Overall opacity of the canvas (0–1) */
  opacity?: number;
  /** Intensity of the glow / color saturation (0–1) */
  intensity?: number;
  /** Edge glow strength multiplier */
  glow?: number;
  /** CSS class names applied to the wrapper */
  className?: string;
  /** Inline styles applied to the wrapper */
  style?: CSSProperties;
  /** z-index for the canvas container (default: -1) */
  zIndex?: number;
}

// ── Shader Sources ─────────────────────────────────────
const VERT_SRC = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const FRAG_SRC = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intensity;
  uniform float u_glow;

  // Simplex 3D Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Obsidian OLED background
    vec3 bg = vec3(0.039, 0.039, 0.059); // #0A0A0F

    // Perimeter edge glow
    float bottomGlow = pow(1.0 - uv.y, 2.5);
    float sidesGlow = pow(1.0 - uv.x, 3.0) + pow(uv.x, 3.0);
    float edgeIntensity = (bottomGlow * 1.5 + sidesGlow * 0.8) * smoothstep(0.8, 0.0, uv.y);

    // Drifting fluid motion
    float n1 = snoise(vec3(uv * 1.5, u_time * 0.2));
    float n2 = snoise(vec3(uv * 3.0 - vec2(0.0, u_time * 0.3), u_time * 0.4));
    float fluid = snoise(vec3(uv.x * 2.0 + n1, uv.y * 2.0 + n2, u_time * 0.3));

    // Breathing rhythm
    float breath = (sin(u_time * 2.0) * 0.5 + 0.5) * 0.4 + 0.6;

    // Premium palette
    vec3 iceBlue = vec3(0.31, 0.678, 0.859);   // #4FADDB
    vec3 champGold = vec3(0.788, 0.663, 0.431); // #C9A96E

    // Mix smoke over amber
    vec3 glowColor = mix(champGold, iceBlue, breath * smoothstep(-1.0, 1.0, fluid));

    // Apply fluid mask to edges with intensity & glow controls
    float mask = smoothstep(0.1, 1.0, edgeIntensity * (fluid * 0.5 + 0.6));

    // Final compositing
    vec3 finalColor = mix(bg, glowColor, mask * u_intensity * u_glow);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ── Component ──────────────────────────────────────────
export function ObsidianShader({
  active = true,
  speed = 1,
  opacity = 1,
  intensity = 0.9,
  glow = 1.0,
  className = "",
  style,
  zIndex = -1,
}: ObsidianShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(0);
  const propsRef = useRef({ speed, intensity, glow, opacity, active });

  // Keep props ref current without triggering re-renders
  useEffect(() => {
    propsRef.current = { speed, intensity, glow, opacity, active };
  }, [speed, intensity, glow, opacity, active]);

  // Reduced-motion detection
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const compileShader = useCallback(
    (gl: WebGLRenderingContext, type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },
    []
  );

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    // Fullscreen quad
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);

    glRef.current = gl;
    programRef.current = program;
    startTimeRef.current = performance.now();
  }, [compileShader]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for perf
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const needResize =
      canvas.width !== Math.floor(w * dpr) ||
      canvas.height !== Math.floor(h * dpr);

    if (needResize) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
  }, []);

  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !canvas) return;

    const { speed, intensity, glow, active: isActive } = propsRef.current;
    if (!isActive || prefersReducedMotion) return;

    handleResize();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.039, 0.039, 0.059, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uGlow = gl.getUniformLocation(program, "u_glow");

    gl.uniform2f(uRes, canvas.width, canvas.height);
    const elapsed = (performance.now() - startTimeRef.current) * 0.001 * speed;
    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uGlow, glow);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafRef.current = requestAnimationFrame(render);
  }, [handleResize, prefersReducedMotion]);

  // Initialize
  useEffect(() => {
    if (!active || prefersReducedMotion) return;

    initGL();

    const resizeObs = new ResizeObserver(() => handleResize());
    if (canvasRef.current) resizeObs.observe(canvasRef.current);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObs.disconnect();
      const gl = glRef.current;
      if (gl) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        glRef.current = null;
        programRef.current = null;
      }
    };
  }, [active, initGL, render, handleResize]);

  // If reduced motion, render a static fallback
  if (prefersReducedMotion) {
    return (
      <div
        className={className}
        style={{
          position: "fixed",
          inset: 0,
          zIndex,
          background: "#0A0A0F",
          pointerEvents: "none",
          ...style,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
