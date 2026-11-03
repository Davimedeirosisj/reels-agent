import React from 'react';
import { interfaceAt, qaAt } from './education.mjs';
export function EducationalGraphic({
  variant,
  frame,
  fps,
  accent,
  position = { x: 85, y: 650, width: 880 },
  question,
  answer,
  answerAt,
  term,
  text,
  ui,
}) {
  const time = frame / fps,
    box = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: position.width,
      color: '#fff',
      fontFamily: 'Arial',
    };
  if (variant === 'question-answer') {
    const state = qaAt({ question, answer, answerAt }, time),
      progress = Math.min(1, Math.max(0, (time - answerAt) * 5));
    return (
      <div style={box}>
        <div style={{ color: accent, fontSize: 23, letterSpacing: 4, marginBottom: 18 }}>
          PERGUNTA
        </div>
        <div style={{ fontWeight: 800, fontSize: 58, lineHeight: 1.1, overflowWrap: 'break-word' }}>
          {state.question}
        </div>
        {state.answer && (
          <div
            style={{
              marginTop: 35,
              padding: '25px 30px',
              background: '#0c2534',
              borderLeft: `4px solid ${accent}`,
              fontSize: 44,
              lineHeight: 1.2,
              opacity: progress,
              transform: `translateY(${(1 - progress) * 22}px)`,
            }}
          >
            {state.answer}
          </div>
        )}
      </div>
    );
  }
  if (variant === 'definition')
    return (
      <div style={box}>
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            color: accent,
            letterSpacing: -2,
            marginBottom: 24,
            overflowWrap: 'break-word',
          }}
        >
          {term}
        </div>
        <div style={{ width: 90, height: 4, background: accent, marginBottom: 26 }} />
        <div style={{ fontSize: 42, lineHeight: 1.3, fontWeight: 400, overflowWrap: 'break-word' }}>
          {text}
        </div>
      </div>
    );
  const rows = interfaceAt(ui, time);
  return (
    <div
      style={{
        ...box,
        background: '#081925',
        border: '1px solid #ffffff29',
        borderRadius: 24,
        boxShadow: '0 25px 80px #0008',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '24px 30px',
          borderBottom: '1px solid #ffffff20',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div style={{ height: 12, width: 12, borderRadius: 20, background: accent }} />
        <div style={{ fontSize: 27, color: '#bdcbd5' }}>{ui.title || 'Demonstração'}</div>
      </div>
      <div style={{ padding: 25 }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              marginBottom: 12,
              padding: '20px 24px',
              borderRadius: 15,
              border: `1px solid ${row.selected ? accent : '#ffffff14'}`,
              background: row.selected ? '#18394b' : '#0d2533',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: row.kind === 'check' ? 6 : 24,
                border: `2px solid ${row.checked ? accent : '#607b8c'}`,
                background: row.checked ? accent : 'transparent',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{row.label}</div>
              {row.value !== undefined && (
                <div
                  style={{
                    fontSize: 25,
                    lineHeight: 1.3,
                    color: '#b8cbd8',
                    marginTop: 9,
                    overflowWrap: 'break-word',
                    minHeight: 32,
                  }}
                >
                  {row.value}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
