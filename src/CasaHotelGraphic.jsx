import React from 'react';
import { HouseScene } from './HouseScene';
import { easeHouse } from './house-motion.mjs';
const C = {
  white: '#F5F7F6',
  green: '#00D084',
  cyan: '#49E6D1',
  muted: '#AAB8B4',
  warm: '#FFB36B',
};
const iconPaths = {
  house: 'M5 31 32 8l27 23M12 27v31h40V27M26 58V40h13v18',
  table: 'M6 24h52v10H6zM12 34v23M52 34v23M22 9v10M42 9v10',
  book: 'M32 16C19 8 7 13 5 16v38c9-5 18-4 27 2 9-6 18-7 27-2V16c-8-4-18-8-27 0v40',
  prayer: 'M29 9v29L15 55H5l15-29V14c0-7 9-8 9-5ZM35 9v29l14 17h10L44 26V14c0-7-9-8-9-5Z',
  screen: 'M6 9h52v35H6zM32 44v11M21 55h22',
  wifi: 'M5 23c15-17 39-17 54 0M14 33c10-11 26-11 36 0M23 42c5-5 13-5 18 0M31 51h2',
  room: 'M8 8h48v48H8zM32 8v23H8M32 56V43h24',
  life: 'M32 28a10 10 0 1 0 0-20 10 10 0 0 0 0 20M13 56V44c0-19 38-19 38 0v12',
  clock: 'M32 7a25 25 0 1 0 0 50 25 25 0 0 0 0-50M32 17v17l12 8',
};
function Icon({ name, p = 1, size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d={iconPaths[name] || iconPaths.house}
        stroke={C.cyan}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
}
function Background() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 42%,#153a2c,#07100F 66%)',
      }}
    >
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" aria-hidden="true">
        <defs>
          <pattern id="casa-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M80 0H0V80" fill="none" stroke="#49e6d1" strokeOpacity=".055" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="url(#casa-grid)" />
        <path d="M110 210H930M110 1395H930" stroke="#49e6d133" />
      </svg>
    </div>
  );
}
function TableArt({ p }) {
  return (
    <svg viewBox="0 0 900 650" width="100%" aria-hidden="true">
      <defs>
        <linearGradient id="wood">
          <stop stopColor="#a57649" />
          <stop offset="1" stopColor="#65442c" />
        </linearGradient>
      </defs>
      <g transform={`translate(450 325) rotate(${-5 + p * 4}) scale(${0.94 + p * 0.06})`}>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((y) => (
            <rect
              key={`${x}${y}`}
              x={x * 300 - 55}
              y={y * 240 - 45}
              width="110"
              height="90"
              rx="22"
              fill="#193e30"
              stroke="#49e6d144"
            />
          )),
        )}
        <rect
          x="-360"
          y="-205"
          width="720"
          height="410"
          rx="44"
          fill="#000"
          opacity=".3"
          transform="translate(0 20)"
        />
        <rect x="-360" y="-205" width="720" height="410" rx="44" fill="url(#wood)" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M-330 ${-170 + i * 48}h660`} stroke="#e4bd81" opacity=".14" />
        ))}
        {[-1, 1].flatMap((x, a) =>
          [-1, 1].map((y, b) => (
            <g
              key={`${x}${y}`}
              transform={`translate(${x * 205} ${y * 105 + (1 - p) * (a + b ? 90 : -90)})`}
              opacity={p}
            >
              <circle r="68" fill="#e8e6d5" />
              <circle r="53" fill="none" stroke="#b3ad96" strokeWidth="2" />
              <path
                d="M-90-35v70M-97-35v15h14v-15M90-35v70"
                stroke="#e1d4ae"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          )),
        )}
        <ellipse rx="38" ry="55" fill="#173f2b" />
        <path d="M0 45V-55M0-8l-21-20M0 9l22-27" stroke="#52bd80" strokeWidth="4" />
      </g>
    </svg>
  );
}
function BookArt({ p }) {
  return (
    <svg viewBox="0 0 900 650" width="100%" aria-hidden="true">
      <g transform={`translate(450 335) rotate(-6) scale(${0.92 + 0.08 * p})`}>
        <ellipse cy="130" rx="330" ry="95" fill="#0005" />
        <path
          d="M0-190C-70-230-230-220-310-170V190C-210 140-60 150 0 195 60 150 210 140 310 190V-170C230-220 70-230 0-190Z"
          fill="#0e664b"
          stroke="#49e6d1"
          strokeWidth="3"
        />
        <path
          d="M0-175C-90-205-225-195-290-157V165C-195 123-65 138 0 178 65 138 195 123 290 165V-157C225-195 90-205 0-175Z"
          fill="#eae2c9"
        />
        <path d="M0-174V177" stroke="#b4a885" strokeWidth="4" />
        {[-1, 1].flatMap((s) =>
          Array.from({ length: 9 }, (_, i) => (
            <path
              key={`${s}:${i}`}
              d={`M${s * 38} ${-107 + i * 25}q${s * 105} -19 ${s * 210} 0`}
              stroke="#afa68c"
              strokeWidth="4"
              opacity=".5"
            />
          )),
        )}
        <path d="M25-166V227l22-23 22 23V-166" fill="#00a571" />
      </g>
    </svg>
  );
}
export function CasaHotelGraphic({
  frame,
  fps,
  layout = 'hook',
  text = '',
  subtitle = '',
  items = [],
  mode = 'separate',
  position = { x: 110, y: 1180, width: 820, height: 250 },
}) {
  const t = frame / fps,
    p = easeHouse(t, 0, 0.32),
    full = ['house', 'table', 'book'].includes(layout);
  const wrap = { position: 'absolute', inset: 0, fontFamily: 'Arial, sans-serif', color: C.white };
  if (full)
    return (
      <div style={wrap}>
        <Background />
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 270,
            fontSize: 23,
            letterSpacing: 6,
            color: C.muted,
          }}
        >
          {' '}
          {subtitle}{' '}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 330,
            width: 820,
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            transform: `translateY(${(1 - p) * 15}px)`,
          }}
        >
          {text}
        </div>
        {layout === 'house' ? (
          <HouseScene frame={frame} fps={fps} mode={mode} />
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 530,
              width: 960,
              transform: `perspective(1200px) rotateX(${(1 - p) * 8}deg)`,
            }}
          >
            {layout === 'table' ? <TableArt p={p} /> : <BookArt p={p} />}
          </div>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 110,
              top: 1290,
              fontSize: 38,
              color: C.cyan,
              opacity: easeHouse(t, item.at || 0, 0.25),
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    );
  const panel = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    transform: `translateY(${(1 - p) * 12}px)`,
    boxSizing: 'border-box',
  };
  if (layout === 'hook')
    return (
      <div style={wrap}>
        <div
          style={{
            ...panel,
            background: 'linear-gradient(90deg,#07100ff2,#07100fdd)',
            padding: '23px 28px',
            borderLeft: `3px solid ${C.green}`,
          }}
        >
          <div style={{ fontSize: 25, letterSpacing: 5, color: C.muted, marginBottom: 10 }}>
            CONVIVÊNCIA • FAMÍLIA
          </div>
          <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
            QUANDO A CASA
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 900,
              lineHeight: 1.03,
              color: C.cyan,
              clipPath: `inset(0 ${100 * (1 - easeHouse(t, 0.12, 0.3))}% 0 0)`,
            }}
          >
            VIRA HOTEL
          </div>
          <svg width="100%" height="20" aria-hidden="true">
            <path
              d="M0 17H740"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - p}
              stroke={C.green}
            />
          </svg>
        </div>
      </div>
    );
  if (layout === 'rooms')
    return (
      <div style={wrap}>
        <div style={panel}>
          {items.map((item, i) => {
            const q = easeHouse(t, item.at || 0, 0.28);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: (i % 2) * 420,
                  top: Math.floor(i / 2) * 155,
                  width: 400,
                  height: 134,
                  background: '#07100ff2',
                  border: '1px solid #00d08466',
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '20px',
                  boxSizing: 'border-box',
                  opacity: q,
                  transform: `translateY(${(1 - q) * 12}px)`,
                }}
              >
                <Icon name={item.icon} p={q} size={55} />
                <span style={{ fontSize: 31, fontWeight: 800, letterSpacing: -0.6 }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  if (layout === 'plan')
    return (
      <div style={wrap}>
        <div
          style={{
            ...panel,
            background: '#07100ff2',
            borderRadius: 22,
            padding: 22,
            border: '1px solid #00d08466',
            display: 'flex',
            gap: 28,
            alignItems: 'center',
          }}
        >
          <svg width="165" height="150" viewBox="0 0 165 150" fill="none" aria-hidden="true">
            <path
              d="M10 140V40l72-30 73 30v100ZM10 72h145M82 72v68M10 108h35v32M110 72v33h45"
              stroke={C.green}
              strokeWidth="2"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - p}
            />
            <rect x="26" y="83" width="36" height="18" rx="5" stroke={C.warm} />
          </svg>
          <div>
            <div style={{ fontSize: 20, letterSpacing: 4, color: C.muted, marginBottom: 14 }}>
              {subtitle}
            </div>
            <div
              style={{ fontSize: 49, fontWeight: 800, lineHeight: 1.05, whiteSpace: 'pre-line' }}
            >
              {items.length ? items.filter(item=>t>=(item.at||0)).map(item=>item.label).join(' / ') : text}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div style={wrap}>
      <div
        style={{
          ...panel,
          background: 'linear-gradient(105deg,#07100ff5,#07100fd9)',
          borderLeft: `3px solid ${C.green}`,
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 26,
        }}
      >
        {layout !== 'rest' && (
          <Icon
            name={layout === 'protected' ? 'house' : items[0]?.icon || 'prayer'}
            p={p}
            size={78}
          />
        )}
        <div>
          <div style={{ fontSize: 20, letterSpacing: 4, color: C.muted, marginBottom: 10 }}>
            {subtitle}
          </div>
          <div
            style={{
              fontSize: layout === 'protected' ? 52 : 62,
              fontWeight: 900,
              lineHeight: 1.05,
              color: layout === 'rest' ? C.cyan : C.white,
              whiteSpace: 'pre-line',
              letterSpacing: -1.8,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
