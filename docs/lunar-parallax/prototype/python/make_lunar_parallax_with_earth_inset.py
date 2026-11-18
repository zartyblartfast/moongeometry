import numpy as np, matplotlib.pyplot as plt
from matplotlib.patches import Circle, Arc, FancyBboxPatch
from matplotlib.gridspec import GridSpec
from pathlib import Path
R=6371.0
latA,latB=-53.1627,46.8126
hA,hB=52.166,26.487
ra,rb=np.deg2rad([latA,latB]); A=np.array([np.cos(ra),np.sin(ra)]);B=np.array([np.cos(rb),np.sin(rb)])
tA=np.array([-np.sin(ra),np.cos(ra)]);tB=np.array([np.sin(rb),-np.cos(rb)])
rot=lambda d:np.array([[np.cos(np.deg2rad(d)),-np.sin(np.deg2rad(d))],[np.sin(np.deg2rad(d)),np.cos(np.deg2rad(d))]])
dA=rot(-hA)@tA;dB=rot(hB)@tB
sA,sB=np.linalg.solve(np.column_stack([dA,-dB]),(B-A)*R)
M=A*R+sA*dA;baseline=np.linalg.norm((B-A)*R); par=np.rad2deg(np.arccos(np.dot(dA,dB)))
assert abs(A@tA)<1e-12 and abs(B@tB)<1e-12
assert sA>0 and sB>0
print('spherical model',dict(baseline_km=baseline,parallax_deg=par,AM_km=sA,BM_km=sB,OM_km=np.linalg.norm(M)))
C={'bg':'#071222','panel':'#102238','white':'#f4f7fd','muted':'#adc3d7','cyan':'#39ddd9','gold':'#ffc15c','border':'#3c5a75','purple':'#c1a1ff'}
plt.rcParams.update({'font.family':'DejaVu Sans','svg.fonttype':'none'})
fig=plt.figure(figsize=(16,10.2),facecolor=C['bg']);gs=GridSpec(2,2,figure=fig,width_ratios=[1.08,1],height_ratios=[1,.31],left=.042,right=.963,bottom=.075,top=.83,wspace=.042,hspace=.07)
fig.text(.045,.954,'LUNAR PARALLAX  |  TWO OBSERVERS, ONE MOON',color=C['white'],fontsize=24,weight='bold')
fig.text(.045,.912,'71° W meridian  •  16 Nov 2026  •  22:24 UTC  •  idealised spherical-Earth construction',color=C['muted'],fontsize=13)
fig.text(.045,.867,'LEFT  ·  Measured altitude from each local tangent',color=C['cyan'],fontsize=13,weight='bold')
fig.text(.55,.867,'RIGHT  ·  Off-panel convergence (not to scale)',color=C['purple'],fontsize=13,weight='bold')
ax=fig.add_subplot(gs[0,0]); ax.set_facecolor(C['panel']);ax.set_xlim(-1.32,4.25);ax.set_ylim(-1.55,1.55);ax.set_aspect('equal');ax.set_xticks([]);ax.set_yticks([])
for sp in ax.spines.values():sp.set_color(C['border'])
ax.add_patch(Circle((0,0),1,facecolor='#194069',edgecolor='#b4dcff',lw=2.3))
ax.scatter([0],[0],color='white',s=30,zorder=4);ax.text(-.20,-.12,'O',color='white',fontsize=14,weight='bold')
for p,t,d,name,lat,color,h,rr in [(A,tA,dA,'A','53.1627° S',C['gold'],hA,.34),(B,tB,dB,'B','46.8126° N',C['cyan'],hB,.35)]:
 ax.plot([0,p[0]],[0,p[1]],color='#e5eaf3',lw=1.8)
 ends=np.array([p-.7*t,p+.7*t]);ax.plot(ends[:,0],ends[:,1],ls=(0,(5,4)),color=color,lw=2.1)
 ax.scatter([p[0]],[p[1]],s=90,color=color,zorder=7)
 ax.text(p[0]-.15,p[1]+(.14 if name=='B' else -.25),name,color=color,fontsize=16,weight='bold')
 # right-angle marker, inward square
 inward=-p; q=p+.13*t; corner=q+.13*inward; r=p+.13*inward
 ax.plot([q[0],corner[0],r[0]],[q[1],corner[1],r[1]],color='white',lw=1.4)
 cutoff=(4.03-p[0])/d[0]; endpoint=p+cutoff*d;ax.plot([p[0],endpoint[0]],[p[1],endpoint[1]],color=color,lw=2.7)
 angT=np.rad2deg(np.arctan2(t[1],t[0]));angD=np.rad2deg(np.arctan2(d[1],d[0]));ax.add_patch(Arc(p,rr*2,rr*2,theta1=min(angT,angD),theta2=max(angT,angD),color=color,lw=2))
 ax.text(1.37,.51 if name=='B' else -.75,f'{h:.3f}°',color=color,fontsize=15,weight='bold')
 ax.text(-1.22,1.37 if name=='B' else -1.37,f'{name} · {lat} · 71° W',color=color,fontsize=12,weight='bold')
ax.text(2.07,1.15,'DASHED  = tangent local horizons',color=C['white'],fontsize=11)
ax.text(2.07,.98,'SOLID  = sightlines to the Moon',color=C['white'],fontsize=11)
ax.text(2.07,-1.35,'Sightlines continue into inset  →',color=C['muted'],fontsize=11,style='italic')
# inset: meridian cross-section with observers at their actual latitudes.
# Schematic only: position of Moon, separation, and angle are NOT to scale.
bx=fig.add_subplot(gs[0,1]); bx.set_facecolor(C['panel']);bx.set_xlim(0,10);bx.set_ylim(0,10);bx.set_aspect('equal');bx.set_xticks([]);bx.set_yticks([])
for sp in bx.spines.values():sp.set_color(C['border'])
center=np.array([2.15,5.0]); earth_r=1.60
p_a=center+earth_r*A; p_b=center+earth_r*B
moon=np.array([8.85,5.20])
bx.add_patch(Circle(center,earth_r,facecolor='#194069',edgecolor='#b4dcff',lw=2.3,zorder=1))
bx.plot([center[0],p_a[0]],[center[1],p_a[1]],color='#dce9f5',lw=1.7,zorder=3)
bx.plot([center[0],p_b[0]],[center[1],p_b[1]],color='#dce9f5',lw=1.7,zorder=3)
bx.scatter([center[0]],[center[1]],color=C['white'],s=28,zorder=5)
bx.text(center[0]-.26,center[1]-.22,'O',color=C['white'],fontsize=13,weight='bold')
bx.text(.85,5.05,'EARTH',color=C['muted'],fontsize=12,weight='bold')
# Observer chord is a solid white line within the Earth, not a surface arc.
bx.plot([p_a[0],p_b[0]],[p_a[1],p_b[1]],color='#dce9f5',ls=(0,(3,4)),lw=1.7,zorder=3)
# Rays begin exactly at the observation points and have the same endpoint on the Moon.
bx.plot([p_a[0],moon[0]],[p_a[1],moon[1]],color=C['gold'],lw=2.7,zorder=4)
bx.plot([p_b[0],moon[0]],[p_b[1],moon[1]],color=C['cyan'],lw=2.7,zorder=4)
for p,col,name,offset in [(p_a,C['gold'],'A',(-.08,-.43)),(p_b,C['cyan'],'B',(-.08,.15))]:
 bx.scatter([p[0]],[p[1]],color=col,s=110,zorder=6)
 bx.text(p[0]+offset[0],p[1]+offset[1],name,color=col,fontsize=16,weight='bold')
bx.add_patch(Circle(moon,.38,facecolor='#d4dbe8',edgecolor='white',lw=1.1,zorder=6))
bx.text(moon[0],moon[1]+.61,'M · MOON',color=C['white'],fontsize=12,weight='bold',ha='center')
# Labels are placed away from their associated line segments for readability.
bx.text(3.65,5.05,'AB = 9,759 km',color=C['white'],fontsize=10.5)
bx.text(4.65,7.42,'B–M ≈ 398,541 km',color=C['cyan'],fontsize=11)
bx.text(5.15,2.8,'A–M ≈ 396,372 km',color=C['gold'],fontsize=11)
bx.text(6.85,6.65,'Parallax at M',color=C['purple'],fontsize=12,weight='bold',ha='center')
bx.text(6.85,6.23,'≈ 1.3717°',color=C['purple'],fontsize=16,weight='bold',ha='center')
bx.text(5.00,1.00,'SCHEMATIC — DISTANCES AND ANGLES NOT TO SCALE',color=C['muted'],fontsize=9.7,weight='bold',ha='center')
# footer two panels
cx=fig.add_subplot(gs[1,0]); dx=fig.add_subplot(gs[1,1]);
for aa in (cx,dx):
 aa.set_facecolor(C['panel']);aa.set_xlim(0,1);aa.set_ylim(0,1);aa.set_xticks([]);aa.set_yticks([])
 for sp in aa.spines.values():sp.set_color(C['border'])
cx.text(.045,.79,'ANGLE MEASUREMENTS',color=C['white'],fontsize=13,weight='bold')
cx.text(.045,.53,'A: 52.166° above its north-facing local horizon',color=C['gold'],fontsize=12)
cx.text(.045,.31,'B: 26.487° above its south-facing local horizon',color=C['cyan'],fontsize=12)
cx.text(.045,.09,'Horizons are perpendicular to OA and OB by construction.',color=C['muted'],fontsize=10)
dx.text(.045,.79,'TRIANGULATION',color=C['white'],fontsize=13,weight='bold')
dx.text(.045,.53,f'Baseline AB ≈ {baseline:,.0f} km   •   Parallax ≈ {par:.4f}°',color=C['purple'],fontsize=11)
dx.text(.045,.31,f'Spherical construction: A–M ≈ {sA:,.0f} km',color=C['white'],fontsize=11)
dx.text(.045,.09,'Earlier WGS84/ephemeris values require reconciliation before final publication.',color=C['muted'],fontsize=9.6)
for ext in ('png','svg'):
 path=f'/mnt/data/lunar_parallax_two_panel.{ext}';fig.savefig(path.replace('lunar_parallax_two_panel','lunar_parallax_earth_inset'),dpi=180,facecolor=fig.get_facecolor());print(path.replace('lunar_parallax_two_panel','lunar_parallax_earth_inset'))