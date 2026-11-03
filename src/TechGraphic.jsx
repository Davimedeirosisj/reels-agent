import React from 'react';
import {interpolate, spring} from 'remotion';

const paths = {
  coins:'M8 8h48v38H8z M8 18h48 M40 29h16v10H40z M16 37h11',
  heart:'M32 52 9 30C-6 12 20 1 32 18 44 1 70 12 55 30Z',
  clock:'M32 8a24 24 0 1 0 0 48 24 24 0 0 0 0-48 M32 18v16l12 7',
  book:'M32 17C19 9 8 12 5 15v36c9-5 18-4 27 2 9-6 18-7 27-2V15c-8-4-18-4-27 2v36',
  spark:'m33 5 5 19 20 8-20 6-5 21-7-21-20-6 20-8Z',
  family:'M21 29a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M45 29a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M5 54V42c0-14 30-14 30 0v12 M35 35c11-7 24-2 24 7v12',
  quote:'M9 36h16v19H6V31c0-13 6-22 19-23v10C15 20 10 26 9 36 M44 36h16v19H41V31c0-13 6-22 19-23v10c-10 2-15 8-16 18',
};
export function TechIcon({name='spark',progress=1,size=64,color='#49E6D1'}) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d={paths[name]||paths.spark} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/>
  </svg>;
}
const clamp=(f,a,b,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
export function TechGraphic({frame:f,fps,position,layout='focus',text='',subtitle='',items=[],accent='#00D084',fullBoard=false}) {
  const enter=spring({frame:f,fps,config:{damping:24,stiffness:160}});
  const panel={position:'absolute',left:position.x,top:position.y,width:position.width,height:position.height||240,
    boxSizing:'border-box',background:'linear-gradient(120deg,rgba(5,6,6,.97),rgba(7,16,15,.94))',
    border:'1px solid '+accent+'88',borderRadius:24,boxShadow:'0 14px 60px #0005',padding:'26px 30px',
    fontFamily:'Arial, sans-serif',color:'#F5F7F6',transform:`translateY(${(1-enter)*16}px)`,overflow:'hidden'};
  const line=<div style={{position:'absolute',bottom:0,left:0,height:2,width:`${clamp(f,3,28)*100}%`,
    background:`linear-gradient(90deg,${accent},#49E6D1)`,boxShadow:`0 0 15px ${accent}88`}}/>;
  if(fullBoard)return <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 20% 40%,#00D08420,transparent 70%),#07100F',fontFamily:'Arial, sans-serif',color:'#F5F7F6'}}>
    <div style={{position:'absolute',left:105,top:330,fontSize:30,letterSpacing:4,color:'#AAB8B4'}}>{text}</div>
    {items.map((item,i)=>{
      const p=clamp(f,Math.round((item.at||0)*fps),Math.round((item.at||0)*fps)+15);
      return <div key={item.label} style={{position:'absolute',left:105,top:470+i*260,width:860,height:190,boxSizing:'border-box',padding:40,
        border:'1px solid #00D08499',borderRadius:22,background:'#050606DD',opacity:p,transform:`translateY(${(1-p)*18}px)`,display:'flex',alignItems:'center',gap:35}}>
        <TechIcon name={item.icon} progress={p} size={70}/><div style={{fontSize:54,fontWeight:800,color:i?'#49E6D1':'#F5F7F6'}}>{item.label}</div>
        {i<items.length-1&&<div style={{position:'absolute',left:70,top:190,height:70,width:2,background:'#00D08466'}}/>}
      </div>;
    })}
  </div>;
  if(layout==='hook'||layout==='closing'){
    const hero=layout==='hook'?1-clamp(f,105,127):0;
    return <>
    {layout==='hook'&&<div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 80% 25%,#00D08422,transparent 60%),#07100F',opacity:hero}}>
      <div style={{position:'absolute',left:120,top:520}}><TechIcon name="coins" size={110} progress={clamp(f,5,35)}/></div>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" aria-hidden="true"><path d="M120 390H960M120 1100H960" stroke="#00D08433" strokeWidth="1" pathLength="1" strokeDasharray="1" strokeDashoffset={1-clamp(f,0,35)}/></svg>
    </div>}
    <div style={{...panel,top:position.y-hero*450,height:(position.height||245)+hero*25}}>
    <div style={{fontSize:20,letterSpacing:4,color:'#AAB8B4',marginBottom:14}}>{subtitle}</div>
    <div style={{fontSize:layout==='hook'?83+hero*20:76,fontWeight:900,lineHeight:1.02,letterSpacing:-3,whiteSpace:'pre-line'}}>
      {text.split('\n').map((part,i)=><div key={part} style={{color:i?'#49E6D1':'#F5F7F6',
        opacity:clamp(f,i*5,i*5+8),transform:`translateY(${clamp(f,i*5,i*5+12,14,0)}px)`}}>{part}</div>)}
    </div>{line}
  </div></>;
  }
  if(layout==='contrast')return <div style={{...panel,padding:0,display:'grid',gridTemplateColumns:'1fr 1fr'}}>
    {[{name:'coins',label:'RIQUEZA'},{name:'heart',label:'PAZ INTERIOR'}].map((item,i)=><div key={item.name}
      style={{padding:'30px 28px',borderLeft:i?'1px solid #00D08444':undefined,
        opacity:clamp(f,i*7,i*7+10),transform:`translateX(${clamp(f,i*7,i*7+16,(i?1:-1)*20,0)}px)`}}>
      <TechIcon name={item.name} progress={clamp(f,i*7,i*7+25)} color={i?'#49E6D1':'#AAB8B4'} size={58}/>
      <div style={{fontSize:40,fontWeight:800,marginTop:15,color:i?'#49E6D1':'#F5F7F6'}}>{item.label}</div>
    </div>)}{line}
  </div>;
  if(layout==='nodes')return <div style={panel}>
    <div style={{fontSize:24,fontWeight:700,letterSpacing:3,color:'#AAB8B4',marginBottom:18}}>{text}</div>
    <svg viewBox="0 0 820 155" width="100%" aria-hidden="true">
      {items.map((item,i)=>{
        const start=Math.round((item.at||0)*fps), p=clamp(f,start,start+18), x=items.length===2?200+i*420:130+i*280;
        return <g key={item.label} opacity={p}>
          {i>0&&<path d={`M${x-235} 32H${x-60}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-p} stroke="#00D084" strokeWidth="2"/>}
          <circle cx={x} cy="32" r="29" fill="#00D08411" stroke="#00D08466"/>
          <g transform={`translate(${x-22} 10) scale(.7)`}><path d={paths[item.icon]||paths.spark} fill="none" stroke="#49E6D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>
          <text x={x} y="102" textAnchor="middle" fill="#F5F7F6" fontSize={items.length===3?32:36} fontFamily="Arial" fontWeight="700">{item.label}</text>
        </g>;
      })}
    </svg>{line}
  </div>;
  if(layout==='words'){
    const active=items.filter(i=>f>=Math.round((i.at||0)*fps)).at(-1)||items[0];
    return <div style={panel}>
      <div style={{fontSize:22,letterSpacing:3,color:'#AAB8B4',marginBottom:24}}>{text}</div>
      <div style={{display:'flex',alignItems:'center',gap:24}}>
        <TechIcon name="spark" progress={clamp(f,0,24)}/>
        <div style={{fontSize:61,fontWeight:900,color:'#49E6D1',letterSpacing:-2}}>{active?.label}</div>
      </div>{line}
    </div>;
  }
  return <div style={{...panel,display:'flex',alignItems:'center',gap:30}}>
    <TechIcon name={layout==='qualifier'?'quote':layout==='time'?'clock':layout==='money'?'coins':'heart'} progress={clamp(f,0,25)} size={76}/>
    <div style={{flex:1,minWidth:0}}>
      {subtitle&&<div style={{fontSize:21,color:'#AAB8B4',letterSpacing:3,marginBottom:12}}>{subtitle}</div>}
      <div style={{fontSize:layout==='qualifier'?57:62,fontWeight:900,letterSpacing:-2,lineHeight:1.07,whiteSpace:'pre-line',color:layout==='qualifier'?'#F5F7F6':'#49E6D1'}}>{text}</div>
      <svg width="100%" height="18" viewBox="0 0 640 18" style={{marginTop:10}} aria-hidden="true">
        <path d="M0 9H620l-8-6m8 6-8 6" fill="none" stroke={accent} strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1-clamp(f,6,30)}/>
      </svg>
    </div>{line}
  </div>;
}
