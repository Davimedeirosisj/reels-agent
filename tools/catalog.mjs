import fs from 'node:fs';
import path from 'node:path';
import { recipes } from '../src/recipes.mjs';
import { root, read, write } from './engine.mjs';
const text = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const own = [...text('prompts/100-motion-graphics.md').matchAll(/^### (\d{3}) — (.+)$/gm)].map(
  (m) => ({
    ...recipes[Number(m[1]) - 1],
    title: m[2].trim(),
    origin: 'project-authored',
    source: 'prompts/100-motion-graphics.md',
    sourceAnchor: m[1],
  }),
);
const motif = [
  ...text('prompts/motif-45-referencias.md').matchAll(
    /^(\d+)\. \*\*(.+?)\*\*.*?categoria \*\*(.+?)\*\*/gm,
  ),
].map((m) => ({
  id: `M${m[1].padStart(3, '0')}`,
  title: m[2],
  category: m[3],
  sourceUrl: 'https://createmotion.io/prompts/',
  status: 'reference-indexed',
  originalReproduced: false,
  individualAttribution: 'pending',
}));
const revid = [
  ...text('prompts/revid-64-referencias.md').matchAll(
    /^\| (\d+) \| (.+?) \| \[(@.+?)\]\((.+?)\) \| (.+?) \|/gm,
  ),
].map((m) => ({
  id: `R${m[1].padStart(3, '0')}`,
  title: m[2],
  author: m[3],
  authorUrl: m[4],
  category: m[5],
  sourceUrl: 'https://www.revid.ai/claude-motion-graphics',
  status: 'reference-indexed',
  originalPromptAvailable: false,
  originalReproduced: false,
}));
const pm = read(path.join(root, 'prompts/prompt-motion-verificados.json')).entries.map((x) => ({
  ...x,
  status: 'reference-indexed',
  originalReproduced: false,
}));
const kinds = [
  'kinetic',
  'title',
  'impact',
  'counter',
  'kinetic',
  'cube3d',
  'terminal',
  'terminal',
  'blueprint',
  'cards3d',
];
const visual = read(path.join(root, 'references/visual/referencias-visuais.json')).references.map(
  (x, i) => ({
    ...x,
    kind: kinds[i],
    status: 'technique-adapted-screenshot-missing',
    originalReproduced: false,
  }),
);
const result = {
  version: 2,
  counts: {
    authored: own.length,
    motif: motif.length,
    revid: revid.length,
    promptMotion: pm.length,
    visual: visual.length,
  },
  authored: own,
  external: [...motif, ...revid, ...pm],
  visual,
  note: 'Mapeamento não comprova render ou equivalência visual. partial/pending preservam lacunas; originais externos permanecem atribuídos. Veja docs/COBERTURA.md.',
};
if (
  own.length !== 100 ||
  motif.length !== 45 ||
  revid.length !== 64 ||
  pm.length !== 5 ||
  visual.length !== 10
)
  throw new Error('Catálogo incompleto');
write(path.join(root, 'public/catalog.json'), result);
const rows = own
  .map((x) => `| ${x.id} | ${x.title} | ${x.kind}: ${x.behavior} | ${x.status} |`)
  .join('\n');
fs.writeFileSync(
  path.join(root, 'docs/COBERTURA.md'),
  `# Cobertura rastreável\n\nGerada por npm run catalog. ${own.length} prompts autorais, ${motif.length} Motif, ${revid.length} Revid, ${pm.length} Prompt Motion e ${visual.length} referências visuais.\n\nOs 100 autorais têm uma entrada individual. Mapeamento é uma especificação executável onde houver componente, e não evidência de conclusão. Estados pending, partial e requires-asset mantêm o trabalho restante explícito. implemented-unverified exige teste de render e avaliação visual.\n\n| ID | Pedido | Implementação / condição | Estado |\n|---|---|---|---|\n${rows}\n\n## Fontes externas e visuais\n\n${result.external.map((x) => `- ${x.id}: ${x.title} — ${x.sourceUrl || x.source_url}; referência indexada, reprodução não executada.`).join('\n')}\n\n${visual.map((x) => `- ${x.id}: ${x.title} → ${x.kind}; imagem original ausente, timing não verificado.`).join('\n')}\n\n## Pendências de fontes\n\nOs 45 índices Motif ainda precisam de autoria/URL individual; os 64 Revid são vídeos de referência, não 64 prompts textuais. O objetivo de curar 100 prompts externos originais continua em aberto. Assets 3D, fontes GoBold e mídia do culto devem ser fornecidos com autorização. Nenhum código externo sem licença foi copiado.\n`,
);
console.log(result.counts);
