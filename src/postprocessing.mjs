const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const options = (value, defaults, name) => {
  if (value === undefined || value === false) return null;
  if (value !== true && !object(value)) throw new Error(`${name} precisa de opções ou booleano`);
  const input = value === true ? {} : value;
  for (const key of Object.keys(input))
    if (!Object.hasOwn(defaults, key)) throw new Error(`${name}: opção desconhecida ${key}`);
  return { ...defaults, ...input };
};
const range = (value, min, max, name) => {
  if (!finite(value) || value < min || value > max)
    throw new Error(`${name} deve ficar entre ${min} e ${max}`);
};
// Effects are opt-in per scene. A missing or explicitly disabled effect does
// not introduce a visual preset, a clock, a random state or an audio change.
export function resolvePostprocessing(input) {
  if (input === undefined || input === false) return null;
  if (!object(input)) throw new Error('postprocessing precisa de uma configuração');
  for (const key of Object.keys(input))
    if (!['enabled', 'bloom', 'chromaticAberration', 'grain'].includes(key))
      throw new Error(`Pós-processamento: opção desconhecida ${key}`);
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean')
    throw new Error('postprocessing.enabled deve ser booleano');
  const bloom = options(
    input.bloom,
    {
      intensity: 0.35,
      luminanceThreshold: 1,
      luminanceSmoothing: 0.15,
      radius: 0.65,
      levels: 4,
    },
    'Bloom',
  );
  if (bloom) {
    range(bloom.intensity, 0, 5, 'Intensidade de bloom');
    range(bloom.luminanceThreshold, 0, 10, 'Limiar de bloom');
    range(bloom.luminanceSmoothing, 0, 1, 'Suavização de bloom');
    range(bloom.radius, 0, 1, 'Raio de bloom');
    if (!Number.isInteger(bloom.levels) || bloom.levels < 1 || bloom.levels > 8)
      throw new Error('Bloom levels deve ser inteiro entre 1 e 8');
  }
  const chromaticAberration = options(
    input.chromaticAberration,
    { offset: [0.001, 0.0005] },
    'Aberração cromática',
  );
  if (
    chromaticAberration &&
    (!Array.isArray(chromaticAberration.offset) ||
      chromaticAberration.offset.length !== 2 ||
      chromaticAberration.offset.some((value) => !finite(value) || Math.abs(value) > 0.02))
  )
    throw new Error('Offset cromático requer dois números entre -0.02 e 0.02');
  const grain = options(
    input.grain,
    { opacity: 0.03, size: 1, seed: 'reels-agent', animate: true },
    'Grão',
  );
  if (grain) {
    range(grain.opacity, 0, 0.2, 'Opacidade do grão');
    range(grain.size, 0.5, 12, 'Tamanho do grão');
    if (
      (!finite(grain.seed) && (typeof grain.seed !== 'string' || !grain.seed.length)) ||
      typeof grain.animate !== 'boolean'
    )
      throw new Error('Grão requer seed estável e animate booleano');
  }
  if (input.enabled === false) return null;
  const resolved = {
    bloom: bloom?.intensity ? bloom : null,
    chromaticAberration: chromaticAberration?.offset.some((x) => x !== 0)
      ? chromaticAberration
      : null,
    grain: grain?.opacity ? grain : null,
  };
  return Object.values(resolved).some(Boolean) ? resolved : null;
}
