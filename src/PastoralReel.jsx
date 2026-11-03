import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';

const caption = {position:'absolute', bottom:250, left:70, right:70, textAlign:'center', color:'white', fontFamily:'Arial, sans-serif', fontWeight:800, fontSize:54, lineHeight:1.08, textShadow:'0 4px 14px #000', textTransform:'uppercase'};

export const PastoralReel = ({videoSrc, title, segments, zooms = [], accent = '#d9a441', showGrid = false}) => {
  const frame = useCurrentFrame(); const {fps, durationInFrames} = useVideoConfig(); const src = videoSrc.startsWith('/') ? staticFile(videoSrc.slice(1)) : videoSrc;
  const active = segments.find((s) => frame >= s.start * fps && frame < s.end * fps);
  const zoom = zooms.reduce((value, z) => frame >= z.from && frame <= z.to ? z.scale : value, 1);
  const titleOpacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], {extrapolateLeft:'clamp', extrapolateRight:'clamp'});
  const titleY = interpolate(frame, [0, 18], [40, 0], {extrapolateLeft:'clamp', extrapolateRight:'clamp'});
  return <AbsoluteFill style={{backgroundColor:'#101820', overflow:'hidden'}}>
    <AbsoluteFill style={{transform:`scale(${zoom})`, transformOrigin:'center center'}}><OffthreadVideo muted src={src} style={{width:'100%',height:'100%',objectFit:'cover'}} /></AbsoluteFill>
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.58),transparent 35%,rgba(0,0,0,.65))'}} />
    {showGrid && <AbsoluteFill style={{opacity:.12, backgroundImage:`linear-gradient(${accent} 1px,transparent 1px),linear-gradient(90deg,${accent} 1px,transparent 1px)`,backgroundSize:'80px 80px'}} />}
    <div style={{position:'absolute',top:135,left:70,right:70,color:accent,fontFamily:'Arial',fontSize:24,fontWeight:700,letterSpacing:5}}>REELS AGENT / PREGAÇÃO</div>
    <div style={{...caption, top:230, bottom:'auto', opacity:titleOpacity, transform:`translateY(${titleY}px)`, fontSize:68, color:'white'}}>{title}</div>
    {active && <Sequence from={Math.round(active.start*fps)} durationInFrames={Math.max(1,Math.round((active.end-active.start)*fps))}><div style={caption}>{active.text}</div></Sequence>}
    <div style={{position:'absolute',bottom:100,left:70,width:180,height:6,background:accent,transformOrigin:'left',transform:`scaleX(${Math.min(1,frame/durationInFrames)})`}} />
    <Audio src={src} volume={0.9} />
  </AbsoluteFill>;
};
