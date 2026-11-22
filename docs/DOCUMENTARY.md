# Hujjatli "bitta maydon" videolari — ish tartibi (runbook)

> Har ishga tushirilganda: yangi viral hujjatli mavzu → ssenariy → ElevenLabs ovozi (aniq so'z vaqtlari)
> → beat jadvali → HTML Canvas'da chizilgan bitta katta maydon, bitta uzluksiz kamera → MP4.
> AI video, AI rasm va stok kadrlar ishlatilmaydi. Hamma narsa kodda chiziladi.

Kod: `documentary/` · Uslub parametrlari: `documentary/STYLE.md` · Namuna videolar: `referenslar/`
Mavzular tarixi: `mavzular_tarixi.txt` · Tayyor videolar: `output/YYYY-MM-DD_mavzu-nomi.mp4`

## 1. Mavzu
1. `mavzular_tarixi.txt` ni o'qing. Takror yoki juda o'xshash mavzu tanlanmaydi.
2. Viral hujjatli hikoya tanlang: aniq sana, aniq odamlar, kutilmagan burilish, hujjatlar/xaritalar bilan
   ko'rsatsa bo'ladigan voqea (o'g'irliklar, firibgarliklar, sirli yo'qolishlar, tarixiy xatolar...).
3. Faktlarni internetda tekshiring (WebSearch). Raqam yoki iqtibosni o'ylab topmang; manbalar
   `projects/<sana>_<slug>/meta.json` → `sources` ga yoziladi. Manbalar kelishmagan joyni ssenariyga kiritmang.
4. Tarix fayliga qator qo'shing: `YYYY-MM-DD | slug | mavzu (o'zbekcha qisqa)`.

## 2. Ssenariy — `projects/<sana>_<slug>/script.txt`
- Har qator = bitta g'oya = bitta beat. 28–36 qator, 300–380 so'z (≈ 2–2.5 daqiqa).
- Boshida kuchli ilmoq (hook), oxirida tugun yechimi + yakuniy fikr.
- Inglizcha, tabiiy diktor tilida, qisqa gaplar.

## 3. Ovoz
```bash
cd documentary && node tools/voice.mjs --project projects/<sana>_<slug>
```
Har qator uchun bitta ElevenLabs `/with-timestamps` chaqiruvi (kalitni proxy qo'yadi) →
`build/voiceover.wav` + `timings.json` (har qator va har so'zning boshlanish/tugash vaqti).

## 4. Film — `projects/<sana>_<slug>/film.js`
Oldingi loyihani namuna sifatida oching (`projects/2026-11-22_mona-lisa-heist/film.js`).
- `obj({...})` — maydondagi har bir narsa (qog'oz, polaroid, xarita, chizma, yorliq) dunyo koordinatalarida.
  `appear: { line, word }` — obyekt aynan shu so'z aytilganda maydonga tushadi.
- `beat({ line, focus: [id], fx: [...] })` — har qatorga bitta beat; `focus` da faqat BITTA asosiy obyekt
  (yoki bir guruh). Qolgan hamma narsa avtomatik xiralashadi va qorayadi.
- `fx`: `circle`, `highlight`, `underline`, `stamp`, `tag`, `label`, `write`, `route`, `dims`, `xmark`, `check`,
  `custom` — har biri `word` bilan aytilgan so'zga bog'lanadi.
- Qoidalar: har ibora ekranda bir marta; aytilgan gap yo hujjat ichida, yo ekran matni — ikkalasi emas;
  ikkinchi darajali matn faqat kulrang chiziqlar; asosiy so'zlar katta (fokusda ≥ 60 px).
- Obyektlarni ilon izi bo'ylab joylashtiring, ketma-ket beatlar bir-biriga yaqin bo'lsin; ba'zan avvalgi
  obyektga qaytish (masalan, bo'sh devor) hikoyani bog'laydi.

## 5. Tekshiruv (renderdan oldin)
```bash
node render.mjs --project P --table          # beats.md (beat jadvali) + cues.json (SFX)
node render.mjs --project P --sheet          # har beatdan bitta kadr → build/sheet/sheet_*.jpg
node render.mjs --project P --seq 40:44:0.3  # kamera ketma-ketligi
```
Kadrlarni ko'rib chiqing: tiqilinch, o'qib bo'lmaydigan, ustma-ust tushgan yoki keskin silkinadigan
joylarni tuzating. So'nggi so'zga tushgan effekt ko'rinmay qolsa — beatga `linger: 0.5` qo'shing.

## 6. Render + ovoz + chiqish
```bash
./make.sh projects/<sana>_<slug>
```
yoki qadamma-qadam: `node render.mjs --project P` (≈ 13 daqiqa / 150 s, 3 worker) →
`python3 audio/mix.py --project P --out ../output/<sana>_<slug>.mp4` → `python3 tools/check.py ...`.
Natija: 1920×1080, 30 fps, uzunligi ovoz bilan kadrgacha bir xil.
