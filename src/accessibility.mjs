const rgb = (value) => {
  let hex = String(value).trim().toLowerCase();
  hex = { white: '#ffffff', black: '#000000' }[hex] || hex;
  if (/^#[a-f0-9]{3}$/i.test(hex)) hex = '#' + [...hex.slice(1)].map((c) => c + c).join('');
  if (!/^#[a-f0-9]{6}$/i.test(hex))
    throw new Error('Use uma cor RGB hexadecimal para medir contraste');
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
};
const luminance = (channels) =>
  channels
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export function contrastRatio(a, b) {
  return ratio(luminance(rgb(a)), luminance(rgb(b)));
}
export function worstCaseCaptionContrast(foreground, background, opacity) {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error('Opacidade da caixa deve ficar entre 0 e 1');
  const fg = luminance(rgb(foreground)),
    bg = rgb(background);
  const low = luminance(bg.map((c) => c * opacity)),
    high = luminance(bg.map((c) => c * opacity + 1 - opacity));
  return fg >= low && fg <= high ? 1 : Math.min(ratio(fg, low), ratio(fg, high));
}
export function captionAppearance(style = {}) {
  const accessible = style.mode === 'accessible',
    boxed = accessible || Boolean(style.box);
  const color = style.color || '#ffffff',
    boxColor = style.boxColor || '#000000',
    opacity = style.boxOpacity ?? (accessible ? 1 : 0.86);
  const channels = rgb(boxColor).map((c) => Math.round(c * 255));
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error('Opacidade da caixa deve ficar entre 0 e 1');
  let minimumContrast = null;
  try {
    minimumContrast = boxed ? worstCaseCaptionContrast(color, boxColor, opacity) : null;
  } catch (error) {
    if (accessible) throw error;
  }
  if (
    (style.opacity !== undefined && style.opacity !== 1) ||
    (style.filter && style.filter !== 'none') ||
    (style.mixBlendMode && style.mixBlendMode !== 'normal')
  )
    minimumContrast = null;
  return {
    color,
    boxed,
    background: boxed ? `rgba(${channels.join(',')},${opacity})` : undefined,
    minimumContrast,
    scope:
      'Worst-case nominal sRGB colors over arbitrary SDR video; not a complete accessibility certification',
  };
}
export function validateCaptionAccessibility(style = {}) {
  if (style.enabled === false) return [];
  const errors = [];
  try {
    const appearance = captionAppearance(style);
    if (style.mode === 'accessible') {
      if (style.box === false || appearance.minimumContrast < 4.5)
        errors.push('Modo accessible exige caixa e contraste mínimo 4.5:1 sobre o vídeo');
      if (
        (style.opacity !== undefined && style.opacity !== 1) ||
        (style.filter && style.filter !== 'none') ||
        (style.mixBlendMode && style.mixBlendMode !== 'normal') ||
        style.visibility === 'hidden' ||
        style.display === 'none'
      )
        errors.push('Efeito de estilo invalida a legibilidade do modo accessible');
    }
  } catch (error) {
    errors.push(error.message);
  }
  return errors;
}
