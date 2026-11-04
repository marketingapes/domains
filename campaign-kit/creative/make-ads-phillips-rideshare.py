"""PLG-RIDESHARE-SA-001 ad creative. Reproducible: python3 make-ads.py. Writes to ../btl/assets/phillips-rideshare/.
Non-graphic, trauma-informed, no claimant imagery. Nationwide Phillips disclaimer verbatim on every unit (serif/Roman)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
HERE=Path(__file__).resolve().parent; A=HERE.parent/'btl'/'assets'; OUT=A/'phillips-rideshare'; OUT.mkdir(exist_ok=True)
NAT='DISCLAIMER: This advertisement is not for legal services related to an incident that occurred in California, Colorado, Texas or that a California, Colorado, or Texas court would have jurisdiction over.'
LORA='/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf'; SANS='/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'; SANSB='/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'; SERIF='/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf'
NAVY=(11,18,32); INK=(17,24,39); BLUE=(36,87,230); GOLD=(198,161,91); WHITE=(255,255,255); MUTED=(190,198,214)
def F(path,size,bold=False):
    f=ImageFont.truetype(path,size)
    if bold and 'Variable' in path:
        try: f.set_variation_by_name('Bold')
        except Exception: pass
    return f
def wrap(d,text,font,maxw):
    words=text.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=font)<=maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines
def pill(d,x,y,text,font,pad=22,h=66):
    w=int(d.textlength(text,font=font))+pad*2
    d.rounded_rectangle([x,y,x+w,y+h],radius=h//2,outline=BLUE,width=3)
    d.text((x+pad,y+h//2),text,font=font,fill=WHITE,anchor='lm'); return w
DOORS={
 'quiz':dict(h='Sexually assaulted by an Uber or Lyft driver?',sub='Seven private yes/no questions. No story required.',cta='Start a private check'),
 'sofia':dict(h='Talk when you\u2019re ready. Sofia listens first.',sub='An AI intake assistant. A few short questions \u2014 never the details \u2014 then a person takes over.',cta='Talk with Sofia'),
 'form':dict(h='Ask for a private callback.',sub='Pick a time. A person at Phillips Law Group calls you back.',cta='Request a callback'),
}
PILLS=['No story required','Free & confidential','You set the pace']
logo=Image.open(A/'phillips-logo.webp').convert('RGBA'); sofia=Image.open(A/'sofia'/'sofia-portrait-440x784.jpg').convert('RGB')
def bg(w,h):
    im=Image.new('RGB',(w,h),NAVY); d=ImageDraw.Draw(im)
    glow=Image.new('RGB',(w,h),NAVY); g=ImageDraw.Draw(glow); g.ellipse([int(w*.55),-int(h*.25),int(w*1.35),int(h*.55)],fill=(24,52,120)); glow=glow.filter(ImageFilter.GaussianBlur(w//6))
    im=Image.blend(im,glow,0.85); return im
def render(door,w,h,story=False):
    im=bg(w,h); d=ImageDraw.Draw(im); m=int(w*0.065); y=m
    # logo chip
    lg=logo.copy(); lg.thumbnail((int(w*0.30),int(w*0.17))); chip=(lg.width+36,lg.height+24)
    d.rounded_rectangle([m,y,m+chip[0],y+chip[1]],radius=18,fill=WHITE); im.paste(lg,(m+18,y+12),lg); y+=chip[1]+int(h*0.03)
    eyebrow=F(SANSB,int(w*0.028)); d.text((m,y),'RIDESHARE SEXUAL ABUSE \u00b7 UBER OR LYFT',font=eyebrow,fill=GOLD); y+=int(w*0.055)
    pw_=int(w*0.30); gap=int(w*0.04)
    textw=w-2*m-(pw_+gap if door=='sofia' and not story else 0)
    hf=F(LORA,int(w*0.078 if not story else w*0.1),bold=True)
    if door=='sofia' and not story: hf=F(LORA,int(w*0.064),bold=True)
    for ln in wrap(d,DOORS[door]['h'],hf,textw): d.text((m,y),ln,font=hf,fill=WHITE); y+=int(hf.size*1.12)
    y+=int(h*0.015); sf=F(SANS,int(w*0.034 if not story else w*0.044))
    for ln in wrap(d,DOORS[door]['sub'],sf,textw): d.text((m,y),ln,font=sf,fill=MUTED); y+=int(sf.size*1.4)
    y+=int(h*0.025); pf=F(SANSB,int(w*0.03 if not story else w*0.04)); x=m; ph_=int(w*0.062 if not story else w*0.085)
    stack = story or textw<w*0.7
    for ptxt in ([] if door=='sofia' else PILLS):
        pw=pill(d,x,y,ptxt,pf,h=ph_)
        if stack: y+=ph_+(12 if not story else 22)
        else: x+=pw+14
    if not stack: y+=ph_+14
    # CTA sits below the content, never over it
    ch=int(w*0.105); df=F(SERIF,int(w*0.0245)); dl=wrap(d,NAT,df,w-2*m); sh=int(len(dl)*df.size*1.35)+int(w*0.03)
    cy=max(y+int(h*0.035), h-sh-ch-int(h*0.045))
    if door=='sofia':
        sp=sofia.copy()
        if not story:
            py=int(h*0.235); maxh=cy-py-int(h*0.02); sp.thumbnail((pw_,maxh)); px=w-m-sp.width
        else:
            py=y+int(h*0.015); maxh=cy-py-int(h*0.02); sp.thumbnail((int(w*0.5),maxh)); px=(w-sp.width)//2
        mask=Image.new('L',sp.size,0); ImageDraw.Draw(mask).rounded_rectangle([0,0,sp.width,sp.height],radius=36,fill=255)
        im.paste(sp,(px,py),mask)
    d.rounded_rectangle([m,cy,w-m,cy+ch],radius=ch//2,fill=BLUE)
    cf=F(SANSB,int(w*0.042)); d.text((w//2,cy+ch//2),DOORS[door]['cta']+'  \u2192',font=cf,fill=WHITE,anchor='mm')
    # disclaimer strip (serif/Roman, verbatim)
    lines=dl
    d.rectangle([0,h-sh,w,h],fill=WHITE); ty=h-sh+int(w*0.015)
    for ln in lines: d.text((m,ty),ln,font=df,fill=INK); ty+=int(df.size*1.35)
    return im
for door in DOORS:
    render(door,1080,1080).save(OUT/f'ad-{door}.jpg',quality=92,optimize=True)
    render(door,1080,1920,story=True).save(OUT/f'story-{door}.jpg',quality=92,optimize=True)
og=render('quiz',1200,1200).crop((0,180,1200,810)); og.save(OUT/'og.jpg',quality=90,optimize=True)
print('wrote',sorted(p.name for p in OUT.iterdir()))
