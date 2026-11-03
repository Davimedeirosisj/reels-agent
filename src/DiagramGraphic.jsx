import React, { useId } from 'react';
import { interpolate } from 'remotion';
import { graphLayout, edgePath } from './diagrams.mjs';
export function DiagramGraphic({
  variant,
  graph,
  frame,
  fps,
  durationInFrames,
  accent,
  position = { x: 85, y: 650, width: 880, height: 600 },
  fontSize = 30,
}) {
  const width = position.width,
    height = position.height || 600,
    layout = graphLayout(graph, { width, height, kind: variant });
  const markerId = 'arrow' + useId().replace(/:/g, '');
  const reveal =
    graph.revealEverySeconds ?? Math.min(0.25, durationInFrames / fps / (layout.nodes.length + 2));
  const opacity = (delay) =>
    interpolate(frame, [delay, delay + 9], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const delay = (n) => Math.round((n.at ?? n.rank * reveal) * fps);
  return (
    <div style={{ position: 'absolute', left: position.x, top: position.y, width, height }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8Z" fill={accent} />
          </marker>
        </defs>
        {layout.edges.map((e, i) => {
          const a = layout.nodes.find((n) => n.id === e.from),
            b = layout.nodes.find((n) => n.id === e.to),
            t = opacity(Math.max(delay(a), delay(b)));
          return (
            <g key={i}>
              <path
                d={edgePath(a, b, variant)}
                fill="none"
                stroke={accent}
                strokeWidth="3"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - t}
                markerEnd={variant === 'flowchart' && t > 0.95 ? `url(#${markerId})` : undefined}
              />
              {e.label && (
                <foreignObject x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 35} width="150" height="48">
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      fontSize: 19,
                      color: accent,
                      opacity: t,
                      background: '#081722',
                      padding: '4px 9px',
                    }}
                  >
                    {e.label}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
        {layout.nodes.map((n) => (
          <g key={n.id} opacity={opacity(delay(n))}>
            {n.shape === 'decision' ? (
              <path
                d={`M ${n.x + n.width / 2} ${n.y} L ${n.x + n.width} ${n.y + n.height / 2} L ${n.x + n.width / 2} ${n.y + n.height} L ${n.x} ${n.y + n.height / 2} Z`}
                fill="#123143"
                stroke={accent}
                strokeWidth="2"
              />
            ) : (
              <rect
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                rx="18"
                fill="#0c2230"
                stroke={n.color || accent}
                strokeWidth="2"
              />
            )}
            <foreignObject x={n.x + 16} y={n.y + 12} width={n.width - 32} height={n.height - 24}>
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontFamily: 'Arial',
                  fontSize: n.fontSize || fontSize,
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.1,
                  overflowWrap: 'break-word',
                }}
              >
                {n.label}
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
}
