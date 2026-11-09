import { Suspense, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { TextureLoader, AdditiveBlending, BackSide, Group } from 'three';
function GlobeMesh() {
  const group = useRef<Group>(null);
  const texture = useLoader(TextureLoader, '/assets/earth-texture.png');
  useFrame((_state, delta) => { if (group.current) group.current.rotation.y += delta * 0.045; });
  return <group ref={group} rotation={[0,0.12,0]}>
    <mesh rotation={[0,Math.PI,0]}><sphereGeometry args={[2,64,64]}/><meshStandardMaterial map={texture} roughness={0.8} metalness={0.12}/></mesh>
    <mesh><sphereGeometry args={[2.08,64,64]}/><meshBasicMaterial color="#1c96e8" transparent opacity={0.095} blending={AdditiveBlending} side={BackSide}/></mesh>
    <mesh rotation={[0.29,0.36,0.1]}><torusGeometry args={[2.65,0.002,4,150]}/><meshBasicMaterial color="#27b3da" transparent opacity={0.34}/></mesh>
  </group>;
}
function DomGlobe() {
  const [offset,setOffset] = useState(30);
  const dragging = useRef<{startX:number;startOffset:number}|null>(null);
  useEffect(()=>{
    const timer=window.setInterval(()=>{if(!dragging.current)setOffset(o=>(o+.07)%100)},50);
    return ()=>window.clearInterval(timer);
  },[]);
  const down=(event:PointerEvent<HTMLDivElement>)=>{dragging.current={startX:event.clientX,startOffset:offset};event.currentTarget.setPointerCapture(event.pointerId)};
  const move=(event:PointerEvent<HTMLDivElement>)=>{if(!dragging.current)return;setOffset((dragging.current.startOffset+(dragging.current.startX-event.clientX)*.15+10000)%100)};
  const up=(event:PointerEvent<HTMLDivElement>)=>{dragging.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)};
  return <div className="earth-css-environment" aria-label="Rotating globe; drag to rotate" role="img" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    <div className="earth-css-sphere"><div className="earth-css-map" style={{backgroundPosition:`${offset}% 50%`}}/><div className="earth-css-shading"/></div>
  </div>;
}
/** Reliable interactive globe: Three.js when WebGL works, CPU-based fallback otherwise. */
export default function Earth() {
  const [webgl,setWebgl]=useState<boolean|null>(null);
  useEffect(()=>{
    try {
      const c=document.createElement('canvas');
      const context=c.getContext('webgl2')||c.getContext('webgl');
      setWebgl(Boolean(context));
    } catch {setWebgl(false);}
  },[]);
  return <div className="globe-view" aria-label="Interactive rotating globe, drag to rotate">
    {webgl === false && <DomGlobe/>}
    {webgl === true && <Canvas style={{display:'block',width:'100%',height:'100%'}} camera={{position:[0,0,6.7],fov:42}} dpr={[1,1.8]} gl={{antialias:true,alpha:true}}>
      <ambientLight intensity={1.1}/><directionalLight position={[6,2,4]} intensity={2.8} color="#bdedff"/>
      <pointLight position={[-4,0,-5]} intensity={0.7} color="#146aff"/>
      <Stars radius={90} depth={38} count={380} factor={1.9} saturation={0} fade speed={0.3}/>
      <Suspense fallback={null}><GlobeMesh/></Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} minPolarAngle={0.45} maxPolarAngle={2.7}/>
    </Canvas>}
    {webgl === null && <DomGlobe/>}
  </div>;
}
