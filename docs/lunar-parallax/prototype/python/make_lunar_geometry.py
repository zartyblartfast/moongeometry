import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Arc
from matplotlib.gridspec import GridSpec
from pathlib import Path
R=6371.0
la=np.deg2rad(-53.1627); lb=np.deg2rad(46.8126)
hA=52.166; hB=26.487
A=np.array([np.cos(la),np.sin(la)]); B=np.array([np.cos(lb),np.sin(lb)])
# Rightward horizon tangent directions in the common meridian section:
tA=np.array([ -np.sin(la),np.cos(la)]) # points NE at A
tB=np.array([ np.sin(lb),-np.cos(lb)]) # points SE at B
# A sightline lies clockwise (below in page) from NE tangent; B sightline is CCW (above) from SE tangent
rot=lambda deg: np.array([[np.cos(np.deg2rad(deg)),-np.sin(np.deg2rad(deg))],[np.sin(np.deg2rad(deg)),np.cos(np.deg2rad(deg))]])
dA=rot(-hA)@tA; dB=rot(hB)@tB
assert abs(np.dot(A,tA))<1e-12 and abs(np.dot(B,tB))<1e-12
assert abs(np.rad2deg(np.arccos(np.clip(np.dot(dA,tA),-1,1)))-hA)<1e-9
assert abs(np.rad2deg(np.arccos(np.clip(np.dot(dB,tB),-1,1)))-hB)<1e-9
TA,TB=np.linalg.solve(np.column_stack([dA,-dB]),(B-A)*R)
moon=A*R+TA*dA
par=np.rad2deg(np.arccos(dA@dB))
print('A',A,'B',B,'tA',tA,'tB',tB,'direction A',dA,'direction B',dB,'parallax',par,'moon km',np.linalg.norm(moon))
plt.rcParams.update({'font.family':'DejaVu Sans','svg.fonttype':'none'})
fig=plt.figure(figsize=(15.3,9.2),facecolor='#071222')
gs=GridSpec(2,2,figure=fig,width_ratios=[1.5,1],height_ratios=[1,0.16],left=.045,right=.967,top=.87,bottom=.09,wspace=.12,hspace=.13)
ax=fig.add_subplot(gs[0,0]); ax.set_facecolor('#0d2137')
for spine in ax.spines.values(): spine.set_edgecolor('#34526c')
ax.set_aspect('equal'); ax.set_xlim(-1.28,4.25); ax.set_ylim(-1.55,1.55)
ax.add_patch(Circle((0,0),1,facecolor='#133e66',edgecolor='#abdafa',lw=2.3))
ax.scatter([0],[0],s=28,c='white',zorder=5);ax.text(-.18,-.13,'O',color='white',fontsize=13,weight='bold')
for p,tag,color,lat in [(A,'A','#ffc04d','53.1627° S'),(B,'B','#3ce4e1','46.8126° N')]:
    ax.plot([0,p[0]],[0,p[1]],color='#dfecf7',lw=1.8)
    ax.scatter([p[0]],[p[1]],s=95,color=color,zorder=9)
    ax.text(p[0]-.18,p[1]+(.16 if tag=='B' else -.26),tag,fontsize=16,color=color,weight='bold')
    ax.text(-1.2,1.35 if tag=='B' else -1.38,tag+'  ·  '+lat+'  ·  71° W',color=color,fontsize=13,weight='bold')
# horizon straight segments through each observer
for p,t,color in [(A,tA,'#ffd885'),(B,tB,'#8ff8f1')]:
    endpoints=np.array([p-0.68*t,p+0.68*t]); ax.plot(endpoints[:,0],endpoints[:,1],ls='--',lw=2.3,color=color,zorder=4)
    # right angle marker in diagram (within Earth-side quadrant)
    radial_in=-p
    corner=p+.115*t+.115*radial_in
    ax.plot([p[0]+.115*t[0],corner[0],p[0]+.115*radial_in[0]], [p[1]+.115*t[1],corner[1],p[1]+.115*radial_in[1]],color='#fff',lw=1.2)
# Sightlines exact directions extending rightward off frame
for p,d,color in [(A,dA,'#ffb547'),(B,dB,'#3ce4e1')]:
    span=(4.12-p[0])/d[0]
    end=p+span*d
    ax.plot([p[0],end[0]],[p[1],end[1]],color=color,lw=2.5,zorder=3)
    ax.annotate('',xy=end,xytext=end-0.14*d,arrowprops=dict(arrowstyle='->',color=color,lw=2))
# exact arcs in global frame
def arc(p,deg1,deg2,r,color):
    ax.add_patch(Arc(p,2*r,2*r,theta1=min(deg1,deg2),theta2=max(deg1,deg2),color=color,lw=2.1))
arc(A,np.rad2deg(np.arctan2(tA[1],tA[0])),np.rad2deg(np.arctan2(dA[1],dA[0])),.33,'#ffb547')
arc(B,np.rad2deg(np.arctan2(tB[1],tB[0])),np.rad2deg(np.arctan2(dB[1],dB[0])),.37,'#3ce4e1')
ax.text(1.18,-.67,'52.166°',color='#ffce70',fontsize=14,weight='bold')
ax.text(1.32,.48,'26.487°',color='#66f4f0',fontsize=14,weight='bold')
ax.text(2.0,1.15,'DASHED = local horizon tangents',color='#ebf2ff',fontsize=11)
ax.text(2.0,1.00,'SOLID = Moon sightline directions',color='#ebf2ff',fontsize=11)
ax.text(2.0,-1.35,'Moon is far off-panel →',color='#dfe9f6',fontsize=12,style='italic')
ax.set_xticks([]);ax.set_yticks([])
ax.set_title('Shared meridian cross-section  ·  mathematically constructed',color='white',fontsize=15,pad=15)
# local B frame, force horizon horizontal by rotation
right=fig.add_subplot(gs[0,1]);right.set_facecolor('#0d2137');right.set_xlim(-.24,2.55);right.set_ylim(-.15,2.65);right.set_aspect('equal');right.set_xticks([]);right.set_yticks([])
for spine in right.spines.values(): spine.set_edgecolor('#34526c')
right.set_title('Observer-local angle measurements',color='white',fontsize=15,pad=15)
for x0,y0,tag,h,color in [(.32,1.85,'B · Québec City',hB,'#3ce4e1'),(.32,.54,'A · Punta Arenas',hA,'#ffb547')]:
    s=.9
    right.plot([x0-.20,x0+s*1.55],[y0,y0],ls='--',color='#dcecf9',lw=2)
    ang=np.deg2rad(h)
    right.plot([x0,x0+s*1.48*np.cos(ang)],[y0,y0+s*1.48*np.sin(ang)],color=color,lw=2.7)
    right.scatter([x0],[y0],s=60,color=color,zorder=5)
    right.add_patch(Arc((x0,y0),.68,.68,theta1=0,theta2=h,color=color,lw=2))
    right.text(x0+.36,y0+.13, f'{h:.3f}°',color=color,fontsize=13,weight='bold')
    right.text(x0-.12,y0-.24,tag,color='white',fontsize=12,weight='bold')
    right.text(x0+1.06,y0-.15,'Local horizon',color='#b8cddd',fontsize=10)
right.text(.25,.14,'Each local frame has been rotated so its tangent is horizontal.',color='#a9c1d7',fontsize=10)
# footer
footer=fig.add_subplot(gs[1,:]);footer.axis('off')
footer.text(0,.82, '16 Nov 2026 · 22:24 UTC  |  Both observers at 71° W  |  Sea-level, geometric angles (no refraction)',color='white',fontsize=13,weight='bold')
footer.text(0,.3, f'Validated circle geometry: horizon A is 90° to OA; horizon B is 90° to OB; sightline separation = {par:.4f}°.',color='#abd1e8',fontsize=11)
fig.suptitle('LUNAR PARALLAX  |  GEOMETRY VALIDATION PROTOTYPE',fontsize=22,color='white',weight='bold',x=.05,y=.973,ha='left')
for ext in ['svg','png']:
  fig.savefig(f'/mnt/data/lunar_geometry_prototype.{ext}',dpi=180,facecolor=fig.get_facecolor())