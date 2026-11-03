export const SCENE3D_KINDS = ['product3d', 'ui3d', 'light3d'];
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const vector = (v) => Array.isArray(v) && v.length === 3 && v.every(finite);
export function validateScene3d(event) {
  if (!SCENE3D_KINDS.includes(event.kind)) return [];
  const scene = event.scene || {},
    errors = [];
  if (scene.rotation !== undefined && !vector(scene.rotation))
    errors.push('Rotação da cena 3D inválida');
  if (scene.spin !== undefined && !finite(scene.spin))
    errors.push('Velocidade angular 3D inválida');
  if (!event.evidence) errors.push('Cena 3D requer evidence sobre o conceito/asset ilustrado');
  if (event.asset && !/\.glb$/i.test(event.asset))
    errors.push('Modelo 3D deve ser GLB autocontido');
  if (
    event.kind === 'product3d' &&
    !event.asset &&
    scene.product !== 'book' &&
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
    if (
      node.args !== undefined &&
      (!Array.isArray(node.args) || node.args.some((n) => !finite(n) || n <= 0))
    )
      errors.push('Argumentos de geometria inválidos');
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
