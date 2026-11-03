import fs from 'node:fs';
import path from 'node:path';
function identity(file) {
  const absolute = path.resolve(file);
  let canonical;
  try {
    canonical = fs.realpathSync(absolute);
  } catch (error) {
    if (error.code !== 'ENOENT' || path.dirname(absolute) === absolute) throw error;
    canonical = path.join(identity(path.dirname(absolute)).canonical, path.basename(absolute));
  }
  if (process.platform === 'win32') canonical = canonical.toLowerCase();
  const stat = fs.existsSync(absolute) ? fs.statSync(absolute, { bigint: true }) : null;
  return { canonical, inode: stat && stat.ino !== 0n ? `${stat.dev}:${stat.ino}` : null };
}
export function assertOutputsDistinct(outputs, inputs) {
  const originals = inputs.map((file) => ({ file, ...identity(file) }));
  for (const file of outputs) {
    const target = identity(file);
    if (
      originals.some(
        (input) =>
          input.canonical === target.canonical ||
          (input.inode && target.inode && input.inode === target.inode),
      )
    )
      throw new Error('A saída não pode sobrescrever mídia, job ou outra entrada original');
  }
}
