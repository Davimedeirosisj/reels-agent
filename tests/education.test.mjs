import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphLayout, validateGraph, edgePath } from '../src/diagrams.mjs';
import { interfaceAt, qaAt, validateEducation } from '../src/education.mjs';
const graph = {
  nodes: [
    { id: 'a', label: 'Contexto' },
    { id: 'b', label: 'Ensino' },
    { id: 'c', label: 'Aplicação' },
    { id: 'd', label: 'Reflexão' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
    { from: 'b', to: 'd' },
    { from: 'c', to: 'd' },
  ],
};
test('flowchart supports branches and merges with relationships preserved', () => {
  const result = graphLayout(graph);
  assert.equal(result.nodes.find((n) => n.id === 'd').rank, 2);
  assert.equal(result.edges.length, 4);
  assert.match(edgePath(result.nodes[0], result.nodes[1]), /^M .+ C/);
  assert.deepEqual(
    graph.nodes.map((n) => n.x),
    [undefined, undefined, undefined, undefined],
  );
});
test('network supports cycles without imposing a causal DAG', () => {
  const g = {
    nodes: graph.nodes.slice(0, 3),
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'a' },
    ],
  };
  assert.throws(() => graphLayout(g), /cíclico/);
  const a = graphLayout(g, { kind: 'network' });
  assert.deepEqual(a, graphLayout(g, { kind: 'network' }));
  assert.equal(a.edges.length, 3);
});
test('invalid graph relationships cannot invent or silently add nodes', () => {
  assert.ok(validateGraph({ nodes: graph.nodes, edges: [{ from: 'a', to: 'unknown' }] }).length);
  assert.ok(
    validateGraph({
      nodes: [
        { id: 'a', label: 'x' },
        { id: 'a', label: 'y' },
      ],
      edges: [],
    }).length,
  );
});
test('answer is absent before the supplied answer timestamp', () => {
  const e = { question: 'Por quê?', answer: 'Porque o contexto importa.', answerAt: 1.2 };
  assert.equal(qaAt(e, 1).answer, null);
  assert.equal(qaAt(e, 1.2).answer, e.answer);
  assert.ok(validateEducation({ kind: 'question-answer', ...e }, 1).length);
});
test('UI animation is seekable with no cumulative state or external actions', () => {
  const ui = {
    rows: [
      { id: 'text', label: 'Trecho', value: '' },
      { id: 'check', label: 'Revisão' },
    ],
    steps: [
      { at: 0.2, target: 'text', action: 'type', value: 'Mensagem', charsPerSecond: 10 },
      { at: 1, target: 'check', action: 'toggle', value: true },
    ],
  };
  assert.equal(interfaceAt(ui, 0.5)[0].value, 'Men');
  assert.equal(interfaceAt(ui, 2)[1].checked, true);
  assert.equal(interfaceAt(ui, 0.5)[1].checked, undefined);
  assert.equal(ui.rows[0].value, '');
});
