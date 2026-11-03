from PIL import Image
from collections import deque
im=Image.open('exterior.png').convert('RGB');W,H=im.size;px=im.load()
def bg(c):
    r,g,b=c;l=.3*r+.59*g+.11*b
    return (abs(r-19)+abs(g-23)+abs(b-28)<14) or (b>r+14 and g>r+6) or (b>r+25)
seen=bytearray(W*H);q=deque()
for x in range(W):
    for y in (0,H-1):q.append((x,y))
for y in range(H):
    for x in (0,W-1):q.append((x,y))
while q:
    x,y=q.popleft();i=y*W+x
    if seen[i]:continue
    if not bg(px[x,y]):continue
    seen[i]=1
    for a,b in ((1,0),(-1,0),(0,1),(0,-1)):
        X,Y=x+a,y+b
        if 0<=X<W and 0<=Y<H and not seen[Y*W+X]:q.append((X,Y))
out=Image.new('RGBA',(W,H));op=out.load()
for y in range(H):
    for x in range(W):
        if not seen[y*W+x]:op[x,y]=px[x,y]+(255,)
# remove the moon & isolated specks: keep largest component
bb=out.getbbox();print('bbox',bb)
out.save('ship-cut.png')
