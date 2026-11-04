import { resolvePostprocessing } from './postprocessing.mjs';
export const SCENE3D_KINDS = ['product3d', 'ui3d', 'light3d'];
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const vector = (v) => Array.isArray(v) && v.length === 3 && v.every(finite);
const geometryArguments = {
  box: { defaults: [1, 1, 1, 1, 1, 1], positive: [0, 1, 2], segments: { 3: 1, 4: 1, 5: 1 } },
  sphere: {
    defaults: [1, 32, 16, 0, Math.PI * 2, 0, Math.PI],
    positive: [0, 4, 6],
    segments: { 1: 3, 2: 2 },
  },
  cylinder: {
    defaults: [1, 1, 1, 32, 1, false, 0, Math.PI * 2],
    positive: [2, 7],
    nonnegative: [0, 1],
    segments: { 3: 3, 4: 1 },
    boolean: 5,
  },
  torus: { defaults: [1, 0.4, 12, 48, Math.PI * 2], positive: [0, 1, 4], segments: { 2: 3, 3: 3 } },
  plane: { defaults: [1, 1, 1, 1], positive: [0, 1], segments: { 2: 1, 3: 1 } },
};
function validGeometryArguments(node) {
  if (node.args === undefined) return true;
  const spec = geometryArguments[node.geometry];
  if (!spec || !Array.isArray(node.args) || node.args.length > spec.defaults.length) return false;
  const args = spec.defaults.map((value, i) => (i < node.args.length ? node.args[i] : value));
  if (args.some((value, i) => (i === spec.boolean ? typeof value !== 'boolean' : !finite(value))))
    return false;
  if (spec.positive?.some((i) => args[i] <= 0) || spec.nonnegative?.some((i) => args[i] < 0))
    return false;
  if (
    Object.entries(spec.segments || {}).some(
      ([i, min]) => !Number.isInteger(args[i]) || args[i] < min,
    )
  )
    return false;
  if (node.geometry === 'cylinder' && args[0] === 0 && args[1] === 0) return false;
  return true;
}
export function validateScene3d(event) {
  if (!SCENE3D_KINDS.includes(event.kind)) return [];
  const scene = event.scene || {},
    errors = [];
  try {
    resolvePostprocessing(scene.postprocessing);
  } catch (error) {
    errors.push(error.message);
  }
  if (scene.rotation !== undefined && !vector(scene.rotation))
    errors.push('Rotação da cena 3D inválida');
  if (scene.spin !== undefined && !finite(scene.spin))
    errors.push('Velocidade angular 3D inválida');
  if (scene.phone !== undefined) {
    const phone = scene.phone;
    if (
      event.kind !== 'ui3d' ||
      !phone ||
      typeof phone !== 'object' ||
      Array.isArray(phone) ||
      (!phone.asset && !phone.label)
    )
      errors.push('Telefone 3D requer cena ui3d e asset ou label explícito');
    for (const key of ['asset', 'label'])
      if (phone?.[key] !== undefined && (typeof phone[key] !== 'string' || !phone[key].trim()))
        errors.push(`Telefone 3D: ${key} precisa de texto não vazio`);
    for (const key of ['position', 'rotation', 'scale'])
      if (phone?.[key] !== undefined && !vector(phone[key]))
        errors.push(`Telefone 3D: ${key} inválido`);
  }
  if (scene.orbit !== undefined) {
    const orbit = scene.orbit;
    if (!orbit || typeof orbit !== 'object' || Array.isArray(orbit))
      errors.push('Órbita 3D inválida');
    else {
      if (scene.camera?.length)
        errors.push('Escolha câmera por keyframes ou órbita, sem sobreposição');
      if (
        orbit.radius !== undefined &&
        (!finite(orbit.radius) || orbit.radius < 0.5 || orbit.radius > 100)
      )
        errors.push('Raio orbital inválido');
      for (const key of ['elevation', 'angle', 'speed'])
        if (orbit[key] !== undefined && !finite(orbit[key])) errors.push(`Órbita: ${key} inválido`);
      if (orbit.target !== undefined && !vector(orbit.target)) errors.push('Alvo orbital inválido');
      if (orbit.fov !== undefined && (!finite(orbit.fov) || orbit.fov < 10 || orbit.fov > 120))
        errors.push('FOV orbital inválido');
    }
  }
  if (!event.evidence) errors.push('Cena 3D requer evidence sobre o conceito/asset ilustrado');
  if (event.asset && !/\.glb$/i.test(event.asset))
    errors.push('Modelo 3D deve ser GLB autocontido');
  if (
    event.kind === 'product3d' &&
    !event.asset &&
    scene.product !== 'book' &&
    !(event.design === 'casa-hotel' && scene.product === 'house') &&
    !scene.nodes?.length
  )
    errors.push('Produto 3D precisa de GLB, book procedural ou nodes explícitos');
  if (
    event.kind === 'ui3d' &&
    (!event.panels?.length ||
      event.panels.length > 6 ||
      event.panels.some((p) => !p.asset && !p.label))
  )
    errors.push('UI 3D requer 1 a 6 painéis com asset ou label fornecidos');
  if (event.kind === 'light3d' && !scene.nodes?.length)
    errors.push('Iluminação 3D precisa de nodes explícitos');
  for (const node of scene.nodes || []) {
    if (!['box', 'sphere', 'cylinder', 'torus', 'plane'].includes(node.geometry))
      errors.push('Geometria 3D desconhecida');
    for (const key of ['position', 'rotation', 'scale'])
      if (node[key] !== undefined && !vector(node[key])) errors.push(`Node 3D: ${key} inválido`);
    if (!validGeometryArguments(node)) errors.push('Argumentos de geometria inválidos');
    for (const key of ['metalness', 'roughness'])
      if (node[key] !== undefined && (!finite(node[key]) || node[key] < 0 || node[key] > 1))
        errors.push(`Material 3D: ${key} precisa ficar entre 0 e 1`);
    if (
      node.emissiveIntensity !== undefined &&
      (!finite(node.emissiveIntensity) ||
        node.emissiveIntensity < 0 ||
        node.emissiveIntensity > 100)
    )
      errors.push('Emissão de luz 3D inválida');
    if (node.toneMapped !== undefined && typeof node.toneMapped !== 'boolean')
      errors.push('toneMapped deve ser booleano');
  }
  let previous = -1;
  for (const key of scene.camera || []) {
    if (
      !finite(key.time) ||
      key.time < 0 ||
      key.time <= previous ||
      !vector(key.position) ||
      !vector(key.target || [0, 0, 0])
    )
      errors.push('Câmera 3D requer tempos ordenados, position e target');
    if (key.fov !== undefined && (!finite(key.fov) || key.fov < 10 || key.fov > 120))
      errors.push('FOV 3D fora do intervalo 10–120');
    previous = key.time;
  }
  for (const light of scene.lights || []) {
    if (
      !['ambient', 'point', 'directional', 'spot'].includes(light.type) ||
      !finite(light.intensity) ||
      light.intensity < 0 ||
      light.intensity > 100
    )
      errors.push('Luz 3D inválida');
    if (light.position !== undefined && !vector(light.position))
      errors.push('Posição de luz 3D inválida');
  }
  return errors;
}
export function camera3dAt(keys, time) {
  const list = keys?.length
    ? keys
    : [{ time: 0, position: [2, 1.2, 6], target: [0, 0, 0], fov: 42 }];
  let a = list[0],
    b = list.at(-1);
  if (time <= a.time) b = a;
  else if (time >= b.time) a = b;
  else
    for (let i = 1; i < list.length; i++)
      if (time <= list[i].time) {
        a = list[i - 1];
        b = list[i];
        break;
      }
  const t = a === b ? 0 : (time - a.time) / (b.time - a.time),
    smooth = t * t * (3 - 2 * t);
  const blend = (x, y) => x + (y - x) * smooth;
  return {
    position: a.position.map((v, i) => blend(v, b.position[i])),
    target: (a.target || [0, 0, 0]).map((v, i) => blend(v, (b.target || [0, 0, 0])[i])),
    fov: blend(a.fov || 42, b.fov || 42),
  };
}
export function sceneCameraAt(scene, time) {
  if (!scene.orbit) return camera3dAt(scene.camera, time);
  const orbit = scene.orbit,
    target = orbit.target || [0, 0, 0];
  const angle = (orbit.angle ?? 0.25) + time * (orbit.speed ?? 0.12);
  const radius = orbit.radius ?? 6;
  return {
    position: [
      target[0] + Math.sin(angle) * radius,
      target[1] + (orbit.elevation ?? 0.8),
      target[2] + Math.cos(angle) * radius,
    ],
    target,
    fov: orbit.fov ?? 42,
  };
}
export function inspectGlb(buffer) {
  if (
    buffer.length < 20 ||
    buffer.toString('ascii', 0, 4) !== 'glTF' ||
    buffer.readUInt32LE(4) !== 2 ||
    buffer.readUInt32LE(8) !== buffer.length
  )
    throw new Error('GLB 2.0 inválido ou incompleto');
  const size = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a || size + 20 > buffer.length)
    throw new Error('GLB sem chunk JSON válido');
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + size).trim());
  for (const resource of [...(json.buffers || []), ...(json.images || [])])
    if (resource.uri && !resource.uri.startsWith('data:'))
      throw new Error('GLB deve incorporar buffers/texturas, sem arquivos ou URLs externos');
  const unsupported = [
    ...new Set([...(json.extensionsRequired || []), ...(json.extensionsUsed || [])]),
  ].filter((x) =>
    ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(x),
  );
  if (unsupported.length)
    throw new Error('GLB requer decodificador não configurado: ' + unsupported.join(', '));
  return {
    version: 2,
    meshes: json.meshes?.length || 0,
    images: json.images?.length || 0,
    selfContained: true,
  };
}
