import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function fileDigest(file) {
  const digest = crypto.createHash('sha256'),
    buffer = Buffer.alloc(1024 * 1024),
    fd = fs.openSync(file, 'r');
  try {
    let count;
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0)
      digest.update(buffer.subarray(0, count));
  } finally {
    fs.closeSync(fd);
  }
  return digest.digest('hex');
}
export function cacheMedia(source, cacheDirectory) {
  const dir = path.resolve(cacheDirectory),
    sha256 = fileDigest(source),
    file = path.join(dir, sha256 + path.extname(source).toLowerCase());
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(file)) {
    if (fileDigest(file) !== sha256)
      throw new Error('Cache de mídia alterado; não será usado para renderizar');
    return { file, sha256, reused: true };
  }
  const temporary = path.join(dir, '.' + crypto.randomUUID() + '.tmp');
  try {
    fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
    if (fileDigest(temporary) !== sha256) throw new Error('A mídia mudou durante a cópia');
    try {
      fs.linkSync(temporary, file);
    } catch (error) {
      if (error.code === 'EEXIST') {
        if (fileDigest(file) !== sha256)
          throw new Error('Publicação concorrente de cache inválida');
      } else if (['EPERM', 'ENOTSUP', 'EACCES', 'EXDEV'].includes(error.code)) {
        // The complete temporary file is on the same volume. Publishing it by
        // rename is atomic, including when another writer published identical
        // content. Never expose a partially copied cache entry.
        fs.renameSync(temporary, file);
        if (fileDigest(file) !== sha256) throw new Error('Cache publicado inválido');
      } else throw error;
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return { file, sha256, reused: false };
}
export function stageCachedMedia(cached, target) {
  let method = 'hardlink';
  try {
    if (cached.uncached) throw Object.assign(new Error('Copy fallback'), { code: 'ENOTSUP' });
    fs.linkSync(cached.file, target);
  } catch (error) {
    if (!['EPERM', 'ENOTSUP', 'EACCES', 'EXDEV'].includes(error.code)) throw error;
    fs.copyFileSync(cached.file, target, fs.constants.COPYFILE_EXCL);
    method = 'copy';
  }
  if (fileDigest(target) !== cached.sha256) throw new Error('Mídia preparada diverge da origem');
  return { file: target, sha256: cached.sha256, method };
}
