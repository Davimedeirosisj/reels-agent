import React from 'react';
// Direction-specific graphic. Import into MotionLibrary before generic dispatch.
// frame is LOCAL to the event. Every transform is seekable and deterministic.
export function MotionsAtencao({frame=0,fps=30,layout='loop',text='',items=[],labelAt=0,position={x:110,y:1130,width:820,height:270}}){
  const t=frame/fps, ease=(start,d)=>{const x=Math.max(0,Math.min(1,(t-start)/d));return x*x*(3-2*x);};
  const C={ink:'#0B111B',white:'#F4F1E9',blue:'#8EC5FF',amber:'#E6AD62'};
  const p=ease(0,.3), style={position:'absolute',left:position.x,top:position.y,width:position.width,height:position.height,boxSizing:'border-box',padding:28,color:C.white,fontFamily:'Arial, sans-serif',transform:`translateY(${18*(1-p)}px)`,opacity:p};
  if(layout==='tension')return <div style={style}>
    <div style={{fontSize:20,letterSpacing:5,color:C.amber}}>O IMPULSO DE PEGAR</div>
    <div style={{fontSize:85,fontWeight:900,letterSpacing:-3,transform:`translateX(${Math.sin(t*7)*2*(1-ease(.5,.8))}px)`}}>{text}</div>
    <svg width="100%" height="35" viewBox="0 0 760 35"><path d={`M0 17 Q380 ${17-14*ease(0,.7)} 760 17`} stroke={C.blue} fill="none" strokeWidth="2"/></svg>
  </div>;
  if(layout==='closing')return <div style={{...style,borderLeft:`3px solid ${C.amber}`,background:C.ink+'EB'}}>
    <div style={{fontSize:23,color:C.blue,letterSpacing:3}}>PODE ROUBAR</div>
    {items.map((s,i)=><div key={s.label} style={{fontSize:55,fontWeight:800,opacity:ease(s.at||0,.22),transform:`translateX(${16*(1-ease(s.at||0,.22))}px)`}}>{s.label}</div>)}
  </div>;
  if(layout==='protect')return <div style={{...style,background:C.ink+'F2',borderRadius:22}}>
    <svg width="190" height="190" viewBox="0 0 190 190" style={{float:'left',marginRight:25}}>
      <path d="M95 10 167 38v59c0 40-40 66-72 82-32-16-72-42-72-82V38Z" fill="none" stroke={C.amber} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>
      {[65,95,125].map((x,i)=><g key={x} opacity={ease(.1+i*.12,.25)}><circle cx={x} cy={75+i%2*9} r="10" fill={C.white}/><path d={`M${x-12} 118v-15q12-18 24 0v15`} stroke={C.blue} fill="none" strokeWidth="6"/></g>)}
    </svg>
    <div style={{fontSize:21,letterSpacing:3,color:C.amber}}>DENTRO DO CARRO</div><div style={{fontSize:48,fontWeight:900,marginTop:14,whiteSpace:'pre-line'}}>{text}</div>
  </div>;
  return <div style={{...style,background:C.ink+'F0',borderRadius:22}}>
    <svg viewBox="0 0 760 170" width="100%" height="160">
      <path d="M170 60H570Q650 60 650 115H110Q110 60 170 60Z" fill="none" stroke={C.blue} strokeOpacity=".6" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1-ease(.1,.7)}/>
      {[{x:15,label:'POUSA'},{x:265,label:'INTERVALO'},{x:515,label:'PEGA DE NOVO'}].map((s,i)=><g key={s.label} opacity={ease(items[i]?.at??i*.18,.25)}>
        <rect x={s.x} y="12" width="225" height="62" rx="10" fill={i===2?C.amber:C.ink} stroke={C.blue}/>
        <text x={s.x+112} y="51" textAnchor="middle" fontSize="28" fill={i===2?C.ink:C.white} fontFamily="Arial" fontWeight="700">{s.label}</text>
      </g>)}
    </svg><div style={{fontSize:32,color:C.amber,fontWeight:700,opacity:ease(labelAt,.2)}}>{text}</div>
  </div>;
}
