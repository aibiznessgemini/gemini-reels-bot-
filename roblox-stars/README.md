# Roblox story kit — futbolchi personajlar

Roblox story kit uchun Ronaldo, Messi, Neymar, Mbappé, Vini Jr, Haaland va Yamal'ning blokli
(R6) karikatura personajlari. Tashqi ko'rinish: terma jamoa ranglari, raqam va familiya (orqada), har birining
o'ziga xos soch turmagi. **Klub yoki federatsiya gerblari, homiy logotiplari, haqiqiy ovozlar yo'q.**

| Kalit | Raqam | Forma | Soch |
|---|---|---|---|
| `ronaldo` | 7 | qizil / yashil | baland "quiff" |
| `messi` | 10 | havorang-oq yo'l-yo'l | yonga taralgan + soqol |
| `neymar` | 10 | sariq / ko'k | yonlari qirilgan, tepasi sariq |
| `mbappe` | 10 | to'q ko'k / oq | qirilgan bosh |
| `vini` | 7 | sariq / ko'k | baland jingalak |
| `haaland` | 9 | qizil / oq (biroz kattaroq) | sariq, orqada tugun |
| `yamal` | 19 | qizil-sariq / to'q ko'k | jingalak |

## O'rnatish (workspace ichiga)

```bash
cp roblox-stars/rbx/stars.py ~/RobloxStories/rbx/
cp -r roblox-stars/videos/stars_lineup ~/RobloxStories/videos/
```

`setup.py --update` `rbx/` papkasini qayta yozadi — keyin `stars.py`ni qayta nusxalang.

## Ishlatish (`videos/<slug>/shots.py`)

```python
from rbx import stars
from rbx.stars import ronaldo, messi, neymar, mbappe, vini, haaland, yamal, ball, pitch, CAST

@S(3, 12, 18, "Ronaldo vs Messi")
def s03(t0, t1):
    pitch()                                    # stadion: maydon, darvoza (+Y 50), tribunalar, chiroqlar
    R = ronaldo(t0, t1, "smug", loc=(-1.6, 0, 0), rot=20)
    M = messi(t0, t1, "shock", loc=(1.6, 0, 0), rot=-20)
    ball("b", (0, -1.2, 0.45))
    Cam().push(t0, t1, (0, 0, 4.3), 12, 10, lens=30)
```

Barcha acting funksiyalari (`face`, `act`, `talk`, `run`, `jump`, `look_at`, `laugh` …) ular bilan ishlaydi.
Yangi futbolchi = `stars.STARS` lug'atiga bitta yozuv.

## Bulut sessiyasida Blender

`download.blender.org` bloklangan, shuning uchun PyPI'dagi `bpy==5.2.4` moduli ishlatiladi:

```bash
python3 -m venv ~/bpyenv && ~/bpyenv/bin/pip install bpy==5.2.4 numpy
apt-get install -y libegl1 libgl1 libgles2 libegl-mesa0 libgbm1
mkdir -p ~/blender5 && cp roblox-stars/tools/blender_shim.sh ~/blender5/blender && chmod +x ~/blender5/blender
BLENDER=~/blender5/blender python3 <kit>/setup.py
```

EEVEE CPU'da dasturiy rejimda ishlaydi: 50% still ≈ 15 s, preview kadri ≈ 20–45 s; to'liq final ancha sekin.

`lineup_sheet.jpg` — test kadrlar (guruh, orqa tomon, 7 ta yaqin plan).
