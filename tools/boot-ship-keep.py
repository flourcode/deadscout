from PIL import Image
import numpy as np
from scipy import ndimage
src=np.array(Image.open('exterior.png').convert('RGB')).astype(int)
im=np.array(Image.open('ship-cut.png'));a=im[...,3]>0
r,g,b=src[...,0],src[...,1],src[...,2]
a&=~((b>r+5)&(r+g+b<240))           # dark-blue planet shade
op=ndimage.binary_opening(a,structure=np.ones((7,7)))
lab,n=ndimage.label(op);sz=ndimage.sum(op,lab,range(1,n+1));core=lab==1+int(np.argmax(sz))
# reconstruct: grow the core back into the original mask (keeps antennas etc. connected)
m=ndimage.binary_propagation(core,mask=a&ndimage.binary_dilation(core,iterations=6))
for (x0,y0,x1,y1) in [(600,30,800,140),(280,75,380,115),(960,420,1170,600),(10,510,90,560)]:
    m[y0:y1,x0:x1]|=a[y0:y1,x0:x1]
m[0:112,790:]=False;m[0:100,772:]=False
lab,n=ndimage.label(m);sz=ndimage.sum(m,lab,range(1,n+1));
for i,v in enumerate(sz):
    if v<40:m[lab==i+1]=False
m=ndimage.binary_fill_holes(m)
out=np.zeros((src.shape[0],src.shape[1],4),np.uint8);out[...,:3]=src;out[...,3]=m*255
o=Image.fromarray(out);bb=o.getbbox();print(bb);o.crop(bb).save('ship-only.png')
v=Image.new('RGBA',o.crop(bb).size,(255,0,255,255));v.alpha_composite(o.crop(bb));v.convert('RGB').resize((v.size[0]//2,v.size[1]//2)).save('view.png')
