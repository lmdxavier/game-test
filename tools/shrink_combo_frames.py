#!/usr/bin/env python3
# 61 版：序列帧特效图按「屏幕上实际显示多大」缩小（在 crop_combo_frames.py 之后跑）。
# 原因：很多素材是整包高清原图直接用，例如喷火内容宽 1037 像素、屏幕上只显示 52 像素（20 倍），白占显存，
#       而且缩得太多时显卡采样会闪（没有逐级缩小图）。
# 保留倍数：按高画质（一格 ≈ 87 屏幕像素）× 组合里最大的放大（1.5）× 1.5 余量 = 显示宽的 2.25 倍；不到 2 倍富余的不动。
# 缩小倍数记进 assets/combos/crops.js 的第 5、6 项，combo.js drawLayer 按它放回原大小。
# 用法: python3 shrink_combo_frames.py <版本文件夹>      （只能跑一次）
import sys, os, json
from PIL import Image
ver = sys.argv[1]; base = os.path.join(ver, 'assets', 'combos'); cf = os.path.join(base, 'crops.js')
s = open(os.path.join(base, 'combos.js'), encoding='utf8').read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
t = open(cf, encoding='utf8').read(); crops = json.loads(t[t.index('{'):t.rindex('}') + 1])
if any(len(v) > 4 for v in crops.values()): sys.exit('已经缩过了')
CELL = 87 * 1.5 * 1.5
need = {}
for c in d['组合']:
    for l in c['特效层']:
        if l['类型'] == '图集': continue
        r = l['大小格'] * CELL / (l['内容框'][2] - l['内容框'][0])       # 每个素材像素至少要保留多少
        for p in l['帧']: need[p] = max(need.get(p, 0), r)
before = after = n = 0
for p, r in sorted(need.items()):
    f = os.path.join(base, 'img', *p.split('/')); im = Image.open(f).convert('RGBA'); w, h = im.size; before += w * h
    if r >= 0.5 or w * h < 4096: after += w * h; continue
    nw, nh = max(1, round(w * r)), max(1, round(h * r))
    # 预乘透明度再缩，免得透明像素的颜色渗进边缘
    pm = im.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA'); pm.save(f, optimize=True)
    c = crops.get(p) or [0, 0, w, h]; crops[p] = c[:4] + [round(w / nw, 5), round(h / nh, 5)]; after += nw * nh; n += 1
open(cf, 'w', encoding='utf8').write('window.COMBO_CROP=' + json.dumps(crops, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'{len(need)} 张序列帧，缩小了 {n} 张；像素 {before/1e6:.1f}M → {after/1e6:.2f}M（显存约 {before*4/1048576:.0f}MB → {after*4/1048576:.1f}MB）')
