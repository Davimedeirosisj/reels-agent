export function validateEducation(event, duration) {
  const errors = [];
  if (event.kind === 'question-answer') {
    if (
      typeof event.question !== 'string' ||
      !event.question.trim() ||
      typeof event.answer !== 'string' ||
      !event.answer.trim()
    )
      errors.push('Pergunta e resposta literais são obrigatórias');
    if (typeof event.answerAt !== 'number' || event.answerAt < 0 || event.answerAt >= duration)
      errors.push('answerAt deve estar dentro do evento');
  }
  if (event.kind === 'definition' && (!event.term || !event.text))
    errors.push('Definição precisa de term e text');
  if (event.kind === 'interface') {
    if (!event.ui?.rows?.length) errors.push('Interface precisa de rows fornecidas');
    const ids = new Set();
    for (const row of event.ui?.rows || []) {
      if (!row.id || ids.has(row.id)) errors.push('IDs de interface devem ser únicos');
      ids.add(row.id);
    }
    let prev = -1;
    for (const step of event.ui?.steps || []) {
      if (typeof step.at !== 'number' || step.at < prev || step.at < 0 || step.at >= duration)
        errors.push('Steps da interface precisam de tempos ordenados dentro do evento');
      prev = step.at;
      if (!ids.has(step.target)) errors.push('Step de interface aponta para row ausente');
      if (!['select', 'type', 'toggle'].includes(step.action))
        errors.push('Ação visual de interface desconhecida');
    }
  }
  return errors;
}
export function interfaceAt(ui, time) {
  const rows = ui.rows.map((r) => ({ ...r, selected: false }));
  for (const step of ui.steps || []) {
    if (step.at > time) break;
    const row = rows.find((r) => r.id === step.target);
    if (!row) continue;
    if (step.action === 'select') {
      for (const r of rows) r.selected = false;
      row.selected = true;
    }
    if (step.action === 'toggle') row.checked = step.value ?? !row.checked;
    if (step.action === 'type') {
      const chars = Math.max(0, Math.floor((time - step.at) * (step.charsPerSecond || 22)));
      row.value = String(step.value ?? '').slice(0, chars);
    }
  }
  return rows;
}
export function qaAt(event, time) {
  return { question: event.question, answer: time >= event.answerAt ? event.answer : null };
}
