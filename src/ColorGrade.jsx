import React, { useId } from 'react';
import { svgColorMatrix } from './color.mjs';
export function ColorGrade({ grade, children }) {
  const id = 'grade' + useId().replace(/:/g, '');
  if (!grade || grade.intensity === 0) return children;
  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: 'absolute', pointerEvents: 'none' }}
      >
        <defs>
          <filter
            id={id}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters={grade.space || 'linearRGB'}
          >
            <feColorMatrix in="SourceGraphic" type="matrix" values={svgColorMatrix(grade)} />
          </filter>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, filter: `url(#${id})` }}>{children}</div>
    </>
  );
}
