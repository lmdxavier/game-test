#!/usr/bin/env python3
# 61 版：效果组合里「序列帧」类型的图，按每张自己的不透明范围裁掉四周空白，裁掉的偏移记进 assets/combos/crops.js。
# 原因：有的素材每帧都是整张大画布（蜥蜴喷火 flame2 = 16 张 2022×1793，内容只有中间一小块），每张单独上传显卡，一个特效占 230MB 显存。
# combo.js drawLayer 按 crops.js 把裁过的图摆回原位置，画面和裁之前逐像素一致。
# 用法: python3 crop_combo_frames.py <版本文件夹>      （对同一个版本只能跑一次；重新打包组合 build_combos.py 之后要再跑）
import sys, os, json
from PIL import Image
ver = sys.argv[1]; base = os.path.join(ver, 'assets', 'combos'); out = os.path.join(base, 'crops.js')
if os.path.exists(out): sys.exit('crops.js 已存在：这个版本已经裁过了')
s = open(os.path.join(base, 'combos.js'), encoding='utf8').read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
paths = sorted({p for c in d['组合'] for l in c['特效层'] if l['类型'] != '图集' for p in l['帧']})
crops = {}; before = after = 0
for p in paths:
    f = os.path.join(base, 'img', *p.split('/'))
    im = Image.open(f).convert('RGBA'); w, h = im.size; before += w * h
    bb = im.getchannel('A').getbbox()
    if bb is None: bb = (0, 0, 1, 1)
    x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(w, bb[2] + 1), min(h, bb[3] + 1)
    if (x1 - x0) * (y1 - y0) > w * h * 0.7: after += w * h; continue      # 空白不多的不动
    im.crop((x0, y0, x1, y1)).save(f, optimize=True); crops[p] = [x0, y0, w, h]; after += (x1 - x0) * (y1 - y0)
open(out, 'w', encoding='utf8').write('window.COMBO_CROP=' + json.dumps(crops, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'{len(paths)} 张序列帧，裁了 {len(crops)} 张；像素 {before/1e6:.1f}M → {after/1e6:.1f}M（显存约 {before*4/1048576:.0f}MB → {after*4/1048576:.0f}MB）')
