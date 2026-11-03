import React from 'react';
import {Composition} from 'remotion';
import {PastoralReel} from './PastoralReel';

export const RemotionRoot = () => (
  <Composition id="PastoralReel" component={PastoralReel} durationInFrames={150} fps={30} width={1080} height={1920}
    defaultProps={{videoSrc:'/demo-input.mp4', title:'FIDELIDADE À MENSAGEM', segments:[{start:0.5,end:2.5,text:'Teste de render do Reels Agent.'},{start:2.6,end:4.6,text:'A mensagem deve permanecer fiel.'}], zooms:[{from:0,to:75,scale:1},{from:75,to:150,scale:1.06}], accent:'#d9a441', showGrid:false, motion:'kinetic'}} />
);
