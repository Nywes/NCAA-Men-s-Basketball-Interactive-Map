#!/usr/bin/env python3
"""Logos Serie A (LBA) sans le sponsor.

Les logos du CDN LBA sont composés : écusson du club, filet horizontal, logo du
sponsor (ex. Cantù / S.Bernardo). Ce script télécharge le logo brut de chaque
club de src/lba-teams.json, coupe tout ce qui est sous le filet (s'il existe),
recadre sur l'écusson, met au carré et écrit public/lba-logos/<clubId>.png ;
puis fait pointer `logo` du JSON vers ce fichier (chemin relatif, préfixé par
PUBLIC_URL côté site — voir src/logoUrl.js) en gardant l'URL CDN dans `logoSource`.
Logo sans filet (ex. Maxima Roma) : simplement recadré et mis au carré.

Usage : python3 scripts/crop-lba-logos.py        (dépend de Pillow : pip install pillow)
"""
import io
import json
import os
import re
import sys
import urllib.request

from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS_PATH = os.path.join(ROOT, 'src', 'lba-teams.json')
OUT_DIR = os.path.join(ROOT, 'public', 'lba-logos')
CDN = 'https://lba-media.s3.eu-south-1.amazonaws.com'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'}
SIZE = 240  # px, carré


def raw_url(url):
    """URL du fichier brut à partir de l'URL « variants/<clé>/thumb » du CDN."""
    m = re.search(r'/variants/([^/]+)/', url or '')
    return f'{CDN}/{m.group(1)}' if m else url


def ink_mask(im):
    """Masque des pixels « encrés » : opaques et pas blancs."""
    alpha = im.getchannel('A').point(lambda a: 255 if a > 40 else 0)
    dark = im.convert('L').point(lambda g: 255 if g < 235 else 0)
    return ImageChops.multiply(alpha, dark)


def find_rule(mask):
    """Ligne du filet horizontal (séparateur écusson / sponsor), ou None.

    Un filet = groupe de lignes fines (≤ 3 % de la hauteur) couvertes à ≥ 55 % sur
    la bande centrale, situées entre 30 % et 80 % de la hauteur, et isolées : du
    vide (≤ 5 % de couverture) sur 2 % de la hauteur juste au-dessus et au-dessous
    (sinon c'est un trait à l'intérieur d'un écusson rond, ex. Trieste, Reggiana).
    """
    w, h = mask.size
    band = mask.crop((int(w * 0.2), 0, int(w * 0.8), h)).resize((1, h), Image.BOX)
    cov = [band.getpixel((0, y)) / 255 for y in range(h)]
    rows = [y for y in range(int(h * 0.3), int(h * 0.8)) if cov[y] >= 0.55]
    groups = []
    for y in rows:
        if groups and y == groups[-1][1] + 1:
            groups[-1][1] = y
        else:
            groups.append([y, y])
    gap = max(2, int(h * 0.02))
    for y0, y1 in groups:
        if y1 - y0 + 1 > max(2, h * 0.03):
            continue
        above = cov[max(0, y0 - gap):y0]
        below = cov[y1 + 1:y1 + 1 + gap]
        if above and below and max(above) <= 0.05 and max(below) <= 0.05:
            return y0
    return None


def crop_logo(data):
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    mask = ink_mask(im)
    rule = find_rule(mask)
    if rule is not None:
        im = im.crop((0, 0, im.width, max(1, rule - int(im.height * 0.01))))
        mask = mask.crop((0, 0, im.width, im.height))
    box = mask.getbbox()
    if box:
        im = im.crop(box)
    # mise au carré avec une marge transparente de 4 %
    side = int(max(im.size) * 1.08)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    # PNG 8 bits (palette + alpha) : ~3x plus léger, suffisant pour des logos
    return sq.quantize(colors=256, method=Image.FASTOCTREE), rule is not None


def main():
    teams = json.load(open(TEAMS_PATH, encoding='utf8'))
    os.makedirs(OUT_DIR, exist_ok=True)
    changed = 0
    for t in teams:
        # `logo` vient d'être réécrit par update-lba-data.js (URL CDN à jour) ; sinon on repart de logoSource
        src = t['logo'] if str(t.get('logo', '')).startswith('http') else t.get('logoSource')
        if not src or not src.startswith('http'):
            print(f"  {t['displayName']}: pas d'URL de logo, ignoré")
            continue
        try:
            try:
                data = urllib.request.urlopen(urllib.request.Request(raw_url(src), headers=HEADERS), timeout=30).read()
            except Exception:  # fichier brut parfois interdit (403) : on part de la vignette 220 px
                data = urllib.request.urlopen(urllib.request.Request(src, headers=HEADERS), timeout=30).read()
            logo, had_rule = crop_logo(data)
            out = os.path.join(OUT_DIR, f"{t['id']}.png")
            logo.save(out, optimize=True)
            t['logoSource'] = src
            t['logo'] = f"lba-logos/{t['id']}.png"
            changed += 1
            print(f"  {t['displayName']}: {'écusson isolé (filet)' if had_rule else 'logo entier'} -> {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} Ko)")
        except Exception as e:  # téléchargement/recadrage impossible
            if os.path.exists(os.path.join(OUT_DIR, f"{t['id']}.png")):  # on garde l'écusson déjà produit
                t['logoSource'] = src
                t['logo'] = f"lba-logos/{t['id']}.png"
                print(f"  ⚠ {t['displayName']}: {e} — écusson précédent conservé")
            else:
                print(f"  ⚠ {t['displayName']}: {e} — logo CDN conservé")
    json.dump(teams, open(TEAMS_PATH, 'w', encoding='utf8'), indent=2, ensure_ascii=False)
    print(f'{changed} logos recadrés -> {os.path.relpath(OUT_DIR, ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
