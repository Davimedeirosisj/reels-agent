export const DIAGRAM_KINDS = ['flowchart', 'network'];
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
export function validateGraph(graph) {
  const errors = [],
    nodes = graph?.nodes || [],
    edges = graph?.edges || [],
    ids = new Set();
  if (!Array.isArray(nodes) || !nodes.length) return ['Diagrama requer nodes não vazios'];
  for (const n of nodes) {
    if (typeof n.id !== 'string' || !n.id || ids.has(n.id))
      errors.push('IDs de nodes devem ser únicos');
    ids.add(n.id);
    if (typeof n.label !== 'string' || !n.label.trim())
      errors.push(`Node ${n.id}: label obrigatório`);
    if (n.x !== undefined && (!finite(n.x) || !finite(n.y)))
      errors.push(`Node ${n.id}: coordenadas inválidas`);
  }
  if (!Array.isArray(edges)) return [...errors, 'edges deve ser uma lista'];
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to))
      errors.push(`Ligação com node inexistente: ${e.from} → ${e.to}`);
    if (e.from === e.to)
      errors.push('Self loops devem ser representados por um node de repetição explícito');
  }
  return errors;
}
export function graphLayout(graph, { width = 880, height = 560, kind = 'flowchart' } = {}) {
  const errors = validateGraph(graph);
  if (errors.length) throw new Error(errors.join('; '));
  const nodes = graph.nodes.map((n) => ({ ...n })),
    edges = graph.edges || [],
    byId = new Map(nodes.map((n) => [n.id, n]));
  if (nodes.every((n) => finite(n.x) && finite(n.y)))
    return {
      nodes: nodes.map((n, i) => ({
        ...n,
        width: n.width || 220,
        height: n.height || 100,
        rank: i,
      })),
      edges,
    };
  const nodeWidth = Math.min(270, width * 0.27),
    nodeHeight = 100;
  if (kind === 'network') {
    // Deterministic radial layout; relationships come only from supplied edges.
    const degree = new Map(
      nodes.map((n) => [n.id, edges.filter((e) => e.from === n.id || e.to === n.id).length]),
    );
    const hub = [...nodes].sort(
      (a, b) => degree.get(b.id) - degree.get(a.id) || a.id.localeCompare(b.id),
    )[0];
    const satellites = nodes.filter((n) => n !== hub);
    Object.assign(hub, {
      x: width / 2 - nodeWidth / 2,
      y: height / 2 - nodeHeight / 2,
      width: nodeWidth,
      height: nodeHeight,
      rank: 0,
    });
    satellites.forEach((n, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / satellites.length;
      Object.assign(n, {
        x: width / 2 + ((width - nodeWidth - 30) / 2) * Math.cos(angle) - nodeWidth / 2,
        y: height / 2 + ((height - nodeHeight - 30) / 2) * Math.sin(angle) - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
        rank: i + 1,
      });
    });
  } else {
    const indegree = new Map(nodes.map((n) => [n.id, 0])),
      rank = new Map(nodes.map((n) => [n.id, 0]));
    for (const e of edges) indegree.set(e.to, indegree.get(e.to) + 1);
    const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
    let visited = 0;
    while (queue.length) {
      const id = queue.shift();
      visited++;
      for (const e of edges.filter((e) => e.from === id)) {
        rank.set(e.to, Math.max(rank.get(e.to), rank.get(id) + 1));
        indegree.set(e.to, indegree.get(e.to) - 1);
        if (indegree.get(e.to) === 0) queue.push(e.to);
      }
    }
    if (visited !== nodes.length)
      throw new Error('Fluxograma cíclico: use network ou posições explícitas para loops');
    const rows = 1 + Math.max(...rank.values());
    for (let row = 0; row < rows; row++) {
      const group = nodes.filter((n) => rank.get(n.id) === row),
        w = Math.min(270, (width - 24 * (group.length - 1)) / group.length);
      group.forEach((n, i) =>
        Object.assign(n, {
          x: i * (w + 24) + (width - (w * group.length + 24 * (group.length - 1))) / 2,
          y:
            rows === 1
              ? height / 2 - nodeHeight / 2
              : (row * (height - nodeHeight)) / Math.max(1, rows - 1),
          width: w,
          height: nodeHeight,
          rank: row,
        }),
      );
    }
  }
  return {
    nodes,
    edges: edges.map((e) => ({ ...e, fromNode: byId.get(e.from), toNode: byId.get(e.to) })),
  };
}
export function edgePath(a, b, kind = 'flowchart') {
  const ax = a.x + a.width / 2,
    ay = a.y + a.height / 2,
    bx = b.x + b.width / 2,
    by = b.y + b.height / 2;
  if (kind === 'network')
    return `M ${ax} ${ay} Q ${(ax + bx) / 2 + 20} ${(ay + by) / 2 - 20} ${bx} ${by}`;
  const y1 = a.y + a.height,
    y2 = b.y,
    mid = (y1 + y2) / 2;
  return `M ${ax} ${y1} C ${ax} ${mid}, ${bx} ${mid}, ${bx} ${y2}`;
}
