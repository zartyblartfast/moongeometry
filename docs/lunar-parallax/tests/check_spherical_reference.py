"""Self-contained numerical regression for educational spherical Moon parallax reference.
Requires numpy. Not an independent lunar ephemeris validation.
"""
import numpy as np
R=6371.0
latA,latB=-53.1627,46.8126
hA,hB=52.166,26.487
ra,rb=np.deg2rad([latA,latB])
A=np.array([np.cos(ra),np.sin(ra)])
B=np.array([np.cos(rb),np.sin(rb)])
tA=np.array([-np.sin(ra),np.cos(ra)])
tB=np.array([np.sin(rb),-np.cos(rb)])
def rotate(deg):
 a=np.deg2rad(deg)
 return np.array([[np.cos(a),-np.sin(a)],[np.sin(a),np.cos(a)]])
dA=rotate(-hA)@tA
dB=rotate(hB)@tB
assert abs(np.dot(A,tA))<1e-12 and abs(np.dot(B,tB))<1e-12
sA,sB=np.linalg.solve(np.column_stack([dA,-dB]),(B-A)*R)
assert min(sA,sB)>0
M=A*R+sA*dA
assert np.linalg.norm(M-(B*R+sB*dB))<1e-6
baseline=np.linalg.norm((B-A)*R)
par=np.rad2deg(np.arccos(np.clip(np.dot(dA,dB),-1,1)))
assert abs(baseline-9759.17264187)<1e-5
assert abs(par-1.3717)<1e-6
assert abs(sA-396372.32269)<0.01
assert abs(sB-398541.16842)<0.01
assert abs(np.linalg.norm(M)-401423.10379)<0.01
print(f'PASS: AB={baseline:.4f} km, parallax={par:.4f} deg, AM={sA:.2f} km, BM={sB:.2f} km, OM={np.linalg.norm(M):.2f} km')
