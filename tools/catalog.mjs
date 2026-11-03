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
const motifAttributionPath = path.join(root, 'prompts/motif-attribution.json');
const motifAttribution = fs.existsSync(motifAttributionPath) ? read(motifAttributionPath) : null;
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
  ...(motifAttribution?.entries.find((r) => r.id === `M${m[1].padStart(3, '0')}`) || {}),
  individualAttribution: motifAttribution?.entries.find((r) => r.id === `M${m[1].padStart(3, '0')}`)
    ?.individualPromptAvailable
    ? 'individual-page-verified'
    : 'pending',
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
const verificationPath = path.join(root, 'prompts/external-verified.json');
const externalVerification = fs.existsSync(verificationPath) ? read(verificationPath) : null;
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
    verifiedExternalPublications: externalVerification?.entries.length || 0,
    verifiedExternalDistinctTexts: externalVerification?.distinctTextHashes || 0,
  },
  authored: own,
  external: [...motif, ...revid, ...pm],
  visual,
  verifiedExternalPrompts: externalVerification?.entries || [],
  verification: externalVerification
    ? {
        verifiedAtUtc: externalVerification.verifiedAtUtc,
        deduplicationScope: externalVerification.deduplicationScope,
        unverified: externalVerification.unverified,
      }
    : null,
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
  [
    '# Cobertura rastreável',
    `Gerada por npm run catalog. ${own.length} autorais, ${motif.length} Motif, ${revid.length} Revid, ${pm.length} referências legadas Prompt Motion e ${visual.length} visuais.`,
    'Os 100 autorais têm uma entrada individual. Mapeamento não é evidência de conclusão. partial/pending/requires-asset preservam lacunas; implemented-unverified requer teste da receita e avaliação visual.',
    `| ID | Pedido | Implementação / condição | Estado |\n|---|---|---|---|\n${rows}`,
    '## Fontes externas e visuais',
    result.external
      .map(
        (x) => `- ${x.id}: ${x.title} — ${x.sourceUrl || x.source_url}; reprodução não executada.`,
      )
      .join('\n'),
    visual
      .map(
        (x) => `- ${x.id}: ${x.title} → ${x.kind}; imagem original ausente, timing não verificado.`,
      )
      .join('\n'),
    '## Estado das fontes',
    motifAttribution
      ? `Os 45 índices Motif possuem autores e links individuais extraídos da galeria; ${motifAttribution.individualPromptsVerified} páginas individuais tiveram prompt público e link do post original verificados. A associação segue categoria/posição definida pelo índice local; não comprova reprodução.`
      : 'Os 45 índices Motif ainda precisam de autoria/URL individual.',
    externalVerification
      ? `Foram verificadas ${externalVerification.entries.length} publicações externas, com ${externalVerification.distinctTextHashes} hashes distintos de texto; ver FONTES-ORIGINAIS-VERIFICADAS.md.`
      : 'O alvo de 100 textos originais externos ainda não foi verificado.',
    'Os 64 Revid são referências de vídeos, não 64 prompts textuais. Assets 3D e fontes devem ter autorização. Nenhum código externo sem licença foi copiado.\n',
  ].join('\n\n'),
);
if (externalVerification) {
  const sources = externalVerification.entries
    .map(
      (e) =>
        `| ${e.id} | ${e.title.replace(/\|/g, '/')} | ${e.author} | [Página original](${e.sourceUrl}) | ${e.exactDuplicateOf ? 'texto repetido' : 'hash novo'} |`,
    )
    .join('\n');
  fs.writeFileSync(
    path.join(root, 'docs/FONTES-ORIGINAIS-VERIFICADAS.md'),
    `# Fontes originais verificadas\n\n${externalVerification.entries.length} publicações com texto público e autoria; ${externalVerification.distinctTextHashes} hashes de texto distintos após normalização. Verificação em ${externalVerification.verifiedAtUtc}.\n\nO objetivo numérico de verificar pelo menos 100 textos foi atingido. Isso não estabelece 100 famílias semânticas diferentes, não é avaliação de qualidade e não comprova execução desses prompts. Cada fonte permanece como reference-only no catálogo, com link do post original e fingerprint. Nenhum texto integral foi republicado.\n\n| ID | Título abreviado | Criador | Fonte | Deduplicação |\n|---|---|---|---|---|\n${sources}\n\nFalhas/ausências de prompt: ${externalVerification.unverified.length}. Os registros acima provêm do Prompt Motion. Além deles, ${motifAttribution?.individualPromptsVerified || 0} páginas Motif tiveram prompt e post original verificados; os 64 Revid continuam como referências audiovisuais, sem alegação de prompt textual ou reprodução. Técnicas sugeridas por palavras-chave são apenas pistas de curadoria e podem exigir direção/asset específico.\n`,
  );
  fs.appendFileSync(
    path.join(root, 'docs/COBERTURA.md'),
    `\n## Atualização de originais externos\n\nVerificados ${externalVerification.entries.length} registros e ${externalVerification.distinctTextHashes} textos normalizados distintos, com autoria e links individuais. Veja [Fontes verificadas](FONTES-ORIGINAIS-VERIFICADAS.md). A disponibilidade dos originais está comprovada; a reprodução e implementação integral de cada referência continuam em aberto.\n`,
  );
}
console.log(result.counts);
