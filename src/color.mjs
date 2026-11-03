export const IDENTITY_COLOR = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
export function validateColor(grade) {
  if (grade === undefined) return [];
  if (!grade || typeof grade !== 'object' || Array.isArray(grade))
    return ['color deve ser um objeto'];
  const errors = [];
  for (const [key, min, max, length] of [
    ['gain', 0, 8, 3],
    ['offset', -1, 1, 3],
    ['matrix', -8, 8, 12],
  ]) {
    const values = grade[key];
    if (
      values !== undefined &&
      (!Array.isArray(values) ||
        values.length !== length ||
        values.some((x) => !finite(x) || x < min || x > max))
    )
      errors.push(`color.${key}: requer ${length} números finitos entre ${min} e ${max}`);
  }
  if (grade.matrix && (grade.gain || grade.offset))
    errors.push('Use matrix ou gain/offset, sem combinar os dois');
  if (
    grade.intensity !== undefined &&
    (!finite(grade.intensity) || grade.intensity < 0 || grade.intensity > 1)
  )
    errors.push('color.intensity deve estar entre 0 e 1');
  if (grade.space !== undefined && !['linearRGB', 'sRGB'].includes(grade.space))
    errors.push('color.space deve ser linearRGB ou sRGB');
  return errors;
}
export function colorMatrix(grade = {}) {
  const errors = validateColor(grade);
  if (errors.length) throw new Error(errors.join('; '));
  const g = grade.gain || [1, 1, 1],
    o = grade.offset || [0, 0, 0];
  const raw = grade.matrix || [g[0], 0, 0, o[0], 0, g[1], 0, o[1], 0, 0, g[2], o[2]];
  const strength = grade.intensity ?? 1;
  return raw.map((x, i) => IDENTITY_COLOR[i] + (x - IDENTITY_COLOR[i]) * strength);
}
export function svgColorMatrix(grade) {
  const m = colorMatrix(grade);
  return [
    m[0],
    m[1],
    m[2],
    0,
    m[3],
    m[4],
    m[5],
    m[6],
    0,
    m[7],
    m[8],
    m[9],
    m[10],
    0,
    m[11],
    0,
    0,
    0,
    1,
    0,
  ].join(' ');
}
