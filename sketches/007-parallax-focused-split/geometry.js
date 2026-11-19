// Earth-fixed meridian axes: x = outward at the equator, y = east, z = north.
const Parallax = (() => {
  const E=Astronomy, D=Math.PI/180, km=E.KM_PER_AU;
  function memo(limit,fn){const map=new Map();return (...args)=>{const k=args.join('|');if(!map.has(k)){if(map.size>=limit)map.delete(map.keys().next().value);map.set(k,fn(...args));}return map.get(k);};}
  const sky=memo(512,ms=>{const date=new Date(ms);return {moon:E.RotateVector(E.Rotation_EQJ_EQD(date),E.GeoMoon(date)),gast:E.SiderealTime(date)*15};});
  const frame=memo(512,(ms,lon)=>{const {moon:m,gast}=sky(ms),a=(gast+lon)*D,c=Math.cos(a),s=Math.sin(a);return [(m.x*c+m.y*s)*km,(m.y*c-m.x*s)*km,m.z*km];});
  const site=memo(128,lat=>{const s=Math.sin(lat*D),c=Math.cos(lat*D),e2=1-(1-1/298.257223563)**2,n=6378.137/Math.sqrt(1-e2*s*s);return [n*c,0,n*(1-e2)*s];});
  const norm=v=>Math.hypot(...v), sub=(a,b)=>a.map((x,i)=>x-b[i]);
  function observe(m,lat){const d=sub(m,site(lat)),[x,e,z]=d,s=Math.sin(lat*D),c=Math.cos(lat*D),n=z*c-x*s,u=x*c+z*s,p=Math.hypot(x,z);return {d,range:norm(d),alt:Math.atan2(u,Math.hypot(n,e))/D,az:(Math.atan2(e,n)/D+360)%360,ray:{x:p?x/p:0,y:p?-z/p:0}};}
  const snapshot=memo(128,(ms,lon,la,lb)=>{const m=frame(ms,lon),a=observe(m,la),b=observe(m,lb),[x,y,z]=a.d,[i,j,k]=b.d;return {m,geo:norm(m),aRange:a.range,bRange:b.range,altitudeA:a.alt,altitudeB:b.alt,azA:a.az,azB:b.az,rayA:a.ray,rayB:b.ray,baseline:norm(sub(site(la),site(lb))),parallax:Math.atan2(Math.hypot(y*k-z*j,z*i-x*k,x*j-y*i),x*i+y*j+z*k)/D,meridianOffset:-Math.atan2(m[1],m[0])/D,planeAngle:Math.atan2(Math.abs(m[1]),Math.hypot(m[0],m[2]))/D};});
  // Upper culmination closest to the selected instant, not necessarily its UTC date.
  const transit=memo(32,(ms,lon)=>{const o=new E.Observer(0,lon,0);const times=[-1,1].map(dir=>+E.SearchHourAngle('Moon',o,0,new Date(ms),dir).time.date);return times.sort((a,b)=>Math.abs(a-ms)-Math.abs(b-ms))[0];});
  const events=memo(64,(center,lon,lat)=>{const start=center-43200000,obs=new E.Observer(lat,lon,0);return [-1,1].flatMap(dir=>{const t=E.SearchAltitude('Moon',obs,dir,new Date(start),1,0);return t?[(+t.date-center)/60000]:[];}).sort((a,b)=>a-b);});
  // Reconstruct from observer geometry and local directions only; no lunar ranges or position.
  function triangulate(la,lb,hA,hB,azA,azB){
    const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
    const angle=(a,b)=>Math.atan2(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]),dot(a,b));
    const sight=(lat,h,az)=>{const p=lat*D,e=h*D,t=az*D,u=Math.sin(e),n=Math.cos(e)*Math.cos(t);return [u*Math.cos(p)-n*Math.sin(p),Math.cos(e)*Math.sin(t),u*Math.sin(p)+n*Math.cos(p)];};
    const A=site(la),ab=sub(site(lb),A),base=norm(ab),u=sight(la,hA,azA),v=sight(lb,hB,azB),m=angle(u,v),a=angle(ab,u),b=angle(ab.map(x=>-x),v);
    if(base<1e-8||Math.sin(m)<1e-12)return null;
    const am=base*Math.sin(b)/Math.sin(m),bm=base*Math.sin(a)/Math.sin(m);
    return {a:a/D,b:b/D,m:m/D,base,am,bm,om:norm(A.map((x,i)=>x+am*u[i]))};
  }
  return {snapshot,transit,events,site,triangulate};
})();
