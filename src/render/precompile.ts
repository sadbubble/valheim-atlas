import {
  Vector4,
  type BufferGeometry,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

interface Drawable extends Object3D {
  material: Material | Material[];
  geometry: BufferGeometry;
  count?: number;
}
const isDrawable = (o: Object3D): o is Drawable =>
  'material' in o && 'geometry' in o && (o as { material?: unknown }).material != null;

const materialsOf = (o: Drawable): Material[] =>
  Array.isArray(o.material) ? o.material : [o.material];

/** One object per distinct (material, vertex layout, kind): each needs its own GPU pipeline. */
function representatives(root: Object3D): Drawable[] {
  const seen = new Set<string>();
  const out: Drawable[] = [];
  root.traverse((o) => {
    if (!isDrawable(o)) return;
    const layout = Object.keys(o.geometry.attributes).sort().join(',');
    const mats = materialsOf(o)
      .map((m) => m.uuid)
      .join('+');
    const key = `${mats}|${layout}|${o.geometry.index ? 'i' : ''}|${o.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(o);
  });
  return out;
}

interface ProgramLike {
  getUniforms(): unknown;
  isReady?(): boolean;
}
function programOf(gl: WebGLRenderer, m: Material): ProgramLike | null {
  const props = gl.properties.get(m);
  if (typeof props !== 'object' || props === null || !('currentProgram' in props)) return null;
  const p = (props as { currentProgram?: Partial<ProgramLike> }).currentProgram;
  return typeof p?.getUniforms === 'function' ? (p as ProgramLike) : null;
}

const savedScissor = new Vector4();

export interface PrecompileOptions {
  /**
   * Without KHR_parallel_shader_compile there is no way to ask whether a shader is done
   * without blocking, so wait this long (render loop paused) for the GPU process to compile
   * the queued shaders in the background first.
   */
  settleMs: number;
  cancelled: () => boolean;
}

/**
 * Gets every shader under `root` ready behind the loading screen, so the first frame that
 * shows the world doesn't stall. Call it with the render loop paused (see WorldScene).
 *
 * 1. Queue all shader compiles at once (non-blocking GL calls).
 * 2. Let them finish in the background: poll KHR_parallel_shader_compile where the browser
 *    has it (no stalls at all), else wait `settleMs`.
 * 3. Upload `textures`, one per task.
 * 4. Per distinct material: check its program in one task, then draw it into one scissored
 *    pixel in the next. Some drivers (e.g. software WebGL through ANGLE/SwiftShader) only
 *    finish a program at its first use; one per task keeps each stall to one shader.
 *
 * The world is still faded out (uReveal = 0) meanwhile, so that pixel shows nothing.
 */
export async function precompileScene(
  gl: WebGLRenderer,
  root: Object3D,
  camera: Camera,
  scene: Scene,
  textures: readonly Texture[],
  opts: PrecompileOptions,
): Promise<void> {
  const { cancelled } = opts;
  gl.compile(root, camera, scene);
  const reps = representatives(root);
  const programs = reps.flatMap((o) => materialsOf(o).map((m) => programOf(gl, m)));

  if (gl.extensions.has('KHR_parallel_shader_compile')) {
    while (!programs.every((p) => p?.isReady?.() ?? true)) {
      await nextFrame();
      if (cancelled()) return;
    }
  } else {
    await sleep(opts.settleMs);
  }

  for (const tex of textures) {
    await sleep(0);
    if (cancelled()) return;
    gl.initTexture(tex);
  }

  for (const obj of reps) {
    await sleep(0);
    if (cancelled()) return;
    for (const m of materialsOf(obj)) programOf(gl, m)?.getUniforms();
    await sleep(0);
    if (cancelled()) return;
    const { visible, frustumCulled, count } = obj;
    const autoClear = gl.autoClear;
    const scissorTest = gl.getScissorTest();
    gl.getScissor(savedScissor);
    obj.visible = true;
    obj.frustumCulled = false;
    // An empty instanced mesh draws nothing, so it would build no pipeline.
    if (count === 0) obj.count = 1;
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(0, 0, 1, 1);
    try {
      gl.render(obj, camera);
    } finally {
      gl.setScissor(savedScissor);
      gl.setScissorTest(scissorTest);
      gl.autoClear = autoClear;
      obj.visible = visible;
      obj.frustumCulled = frustumCulled;
      if (count === 0) obj.count = 0;
    }
  }
}
