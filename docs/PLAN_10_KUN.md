# 10 kunlik hujjatli video rejasi (2026-11-23 → 2026-12-02)

Har kuni bitta video: 16:9, 1920×1080, 30 fps, ≈ 2–2,5 daqiqa, inglizcha diktor, bitta katta maydon va bitta
uzluksiz kamera harakati (`documentary/`). Kategoriyalar har kuni almashadi, shunda videolar bir-biriga o'xshamaydi.

Har bir kun uchun hammasi tayyor turibdi:
- `documentary/projects/<sana>_<slug>/brief.md` — mavzu, ilmoq, maydondagi obyektlar, o'sha kuni tekshiriladigan faktlar, manbalar
- `documentary/projects/<sana>_<slug>/script.txt` — ssenariy qoralamasi (faktlar rejalashtirishda internetdan tekshirilgan;
  manbalarda kelishmovchilik bo'lgan raqamlar ssenariyga kiritilmagan)
- `photos/<sana>_<slug>/README.md` — qaysi suratlar kerak, qayerdan va qanday litsenziya bilan

| # | Sana | Kategoriya | Video | Muqova | Papka |
|---|---|---|---|---|---|
| 1 | 2026-11-23 | FIRIBGARLIK | **The Man Who Sold the Eiffel Tower** — 1925: Viktor Lyustig Eyfel minorasini metallolomga "sotdi" | SOLD + 1925 | `2026-11-23_eiffel-tower-con` |
| 2 | 2026-11-24 | URUSH HIYLASI | **The Dead Man Who Fooled Hitler** — 1943: "Mincemeat" operatsiyasi — soxta hujjatli o'lik Gitlerni aldadi | FAKE + 1943 | `2026-11-24_operation-mincemeat` |
| 3 | 2026-11-25 | HALOKAT | **The Day Boston Drowned in Molasses** — 1919: Bostonni shinni (qora patoka) to'lqini bosdi | 35 MPH + 1919 | `2026-11-25_boston-molasses-flood` |
| 4 | 2026-11-26 | OMON QOLISH | **The Man Who Survived Both Atomic Bombs** — 1945: Tsutomu Yamaguchi — ikkala atom bombasidan omon qolgan odam | TWICE + 1945 | `2026-11-26_yamaguchi-two-bombs` |
| 5 | 2026-11-27 | OCHILMAGAN SIR | **The Hijacker Who Vanished in the Sky** — 1971: D. B. Kuper — samolyotni o'g'irlab, parashyutda g'oyib bo'lgan odam | GONE + 1971 | `2026-11-27_db-cooper` |
| 6 | 2026-11-28 | G'ALATI TARIX | **The War Australia Lost to Birds** — 1932: Avstraliya armiyasi tuyaqushlarga (emu) qarshi urushda yutqazdi | WAR LOST | `2026-11-28_great-emu-war` |
| 7 | 2026-11-29 | ADOLAT / FAN | **The Girls Who Glowed in the Dark** — 1917–1928: "Radiy qizlari" — soat siferblatini bo'yab zaharlangan ishchilar | SAFE? | `2026-11-29_radium-girls` |
| 8 | 2026-11-30 | O'G'IRLIK | **The Heist Ruined by a Sandwich** — 2003: Antverpen olmos o'g'irligi — tarixdagi eng katta, sendvich fosh qildi | SANDWICH | `2026-11-30_antwerp-diamond-heist` |
| 9 | 2026-12-01 | SIRLI VOQEA | **The Town That Could Not Stop Dancing** — 1518: Strasburgdagi "raqs vabosi" — odamlar to'xtay olmay raqsga tushgan | DANCE OR DIE | `2026-12-01_dancing-plague` |
| 10 | 2026-12-02 | TIBBIYOT | **The Healthy Woman Who Spread a Deadly Disease** — 1907: "Tifli Meri" — o'zi sog' bo'lib, kasallik tarqatgan oshpaz | CARRIER + 1907 | `2026-12-02_typhoid-mary` |

## Suratlar bo'yicha qoida
- Faqat **Public Domain / CC0** suratlar (Wikimedia Commons, Library of Congress, AQSh hukumati arxivlari).
  **Pinterest ishlatilmaydi**: u yerdagi suratlarning egasi noma'lum, YouTube'da mualliflik huquqi bo'yicha strike xavfi bor.
- Surat qo'yish ixtiyoriy: bo'lmasa, hamma narsa kodda chiziladi (Mona Liza videosidagidek).
- Avtomatik yuklash: `python3 documentary/tools/fetch_photos.py --out photos/<papka> --q "<so'z>"`.
  Hozir Wikimedia bu bulut muhitining IP manziliga 429 (juda ko'p so'rov) qaytaryapti. Vosita har kuni qayta sinab ko'radi,
  ishlamasa suratsiz davom etadi.

## Har kuni nima bo'ladi
1. Shu kunning papkasi olinadi; `brief.md` dagi "tekshirilsin" bandlari internetda qayta tekshiriladi, ssenariy kerak bo'lsa tuzatiladi.
2. Ovoz → beat jadvali → `film.js` (maydon) → kadrlar tekshiruvi → render → ovoz miksi → `tools/check.py`.
3. Muqova (`tools/thumbnail.mjs`) va `meta.json` (5 ta sarlavha, tavsif, teglar, manbalar).
4. `tools/deliver.sh` — video Telegram botga (≤ 48 MB nusxa), keyin muqova va YouTube matnlari.
5. `mavzular_tarixi.txt` ga qator qo'shiladi, `plan.json` → `"status": "done"`.

## Har bir video tafsilotlari

### 1. 2026-11-23 — The Man Who Sold the Eiffel Tower
- **Ilmoq:** _In 1925, a man sold the Eiffel Tower. He did not own it._
- **Maydon:** Eski Parij xaritasi (1925) + vazirlik blankasi, muhr; Crillon mehmonxonasi xati; maxfiy taklifnomalar; Eyfel minorasining ko'k chizmasi (blueprint); limuzin eskizi; konvertlardagi takliflar; Puasson vizitkasi; pora konverti; Parij→Avstriya poyezd chiptasi va marshrut; gazetalar to'plami; Alkatras kartochkasi
- **Suratlar:** Victor Lustig mugshot (1930-yillar, AQSh hukumati); Eiffel Tower 1920s (fotosurat yoki otkritka); Hôtel de Crillon old postcard; Alcatraz 1930s

### 2. 2026-11-24 — The Dead Man Who Fooled Hitler
- **Ilmoq:** _In 1943, the most important British officer in the war had already been dead for months._
- **Maydon:** O'rta yer dengizi xaritasi (Sitsiliya, Sardiniya, Gretsiya); soxta shaxsiy guvohnoma; sevgi maktublari va kelin surati; teatr chiptalari; zanjirli portfel; maxfiy xat; suv osti kemasi marshruti; Uelva qirg'og'i; nemis razvedkasining nusxasi; qabr toshi
- **Suratlar:** HMS Seraph submarine (1940-yillar); Huelva 1940s port; Mediterranean map 1943 (PD xarita); Allied landing Sicily July 1943 (AQSh/Britaniya hukumati fotosi)

### 3. 2026-11-25 — The Day Boston Drowned in Molasses
- **Ilmoq:** _On a winter day in 1919, a wave swept through Boston. It was not water._
- **Maydon:** Boston North End ko'cha xaritasi; ulkan rezervuarning ko'k chizmasi (perchinlar, yoriq chizig'i); termometr; gazeta sarlavhalari; tezlik/balandlik ma'lumot kartasi; jabrlanganlar soni muhr bilan; sud qarori; yangi qurilish qoidalari hujjati
- **Suratlar:** Boston molasses disaster 1919 photographs (Boston Globe/Public Library, ko'pi PD); North End Boston 1919 map; Boston elevated railway 1919

### 4. 2026-11-26 — The Man Who Survived Both Atomic Bombs
- **Ilmoq:** _On August 6, 1945, Tsutomu Yamaguchi survived an atomic bomb. Three days later, it happened again._
- **Maydon:** Yaponiya xaritasi: Xirosima → Nagasaki (~300 km) marshruti; ish safari buyrug'i (Mitsubishi); soat 8:15 va 11:02; masofa doiralari; poyezd chiptasi; kuyish bintlari; xibakusha guvohnomasi; 2009-yilgi rasmiy tan olish hujjati
- **Suratlar:** Hiroshima after the bombing 1945 (AQSh hukumati, PD) — faqat shahar manzarasi, qurbonlarsiz; Nagasaki Mitsubishi shipyard 1945; Map of Japan 1945

### 5. 2026-11-27 — The Hijacker Who Vanished in the Sky
- **Ilmoq:** _In 1971, a man in a suit hijacked a plane, collected $200,000, and jumped into the night. He was never seen again._
- **Maydon:** Portlend→Sietl→janubga parvoz xaritasi; "Dan Cooper" chiptasi; styuardessaga yozilgan xat; portfel ichidagi "bomba"; 20 dollarlik kupyuralar seriya raqamlari bilan; Boeing 727 orqa zinapoyasining ko'k chizmasi; parashyutlar; FBI eskizi; Tena Bar qumloqi; 5 800 dollar topilmasi
- **Suratlar:** FBI composite sketch of D. B. Cooper (AQSh hukumati, PD); Northwest Orient Boeing 727 (1970-yillar); Boeing 727 aft airstair; Columbia River Tena Bar

### 6. 2026-11-28 — The War Australia Lost to Birds
- **Ilmoq:** _In 1932, Australia sent soldiers and machine guns to fight an enemy. The enemy won. It was a bird._
- **Maydon:** G'arbiy Avstraliya xaritasi (Kampion hududi); bug'doy dalasi rejasi; Lyuis pulemyotining ko'k chizmasi; 10 000 o'q qutisi hisoblagich bilan; harbiy telegramma; gazeta karikaturalari; mayorning hisoboti (986 / 9 860 "da'vo" belgisi bilan); emu izlari
- **Suratlar:** Emu War 1932 soldiers with Lewis gun (Avstraliya, mualliflik muddati o'tgan — PD); Lewis gun diagram; Western Australia wheatbelt 1930s

### 7. 2026-11-29 — The Girls Who Glowed in the Dark
- **Ilmoq:** _They were told it was safe to put the glowing paint in their mouths. It was not._
- **Maydon:** Qorong'ida yonadigan soat siferblati (maydon qorong'ilashadi!); mo'yqalam va "labda uchlash" sxemasi; zavod rejasi (Orinj, Nyu-Jersi); "xavfsiz" degan reklama; jag' rentgeni chizmasi; sud da'vosi papkasi; kelishuv shartlari; mehnat xavfsizligi qonuni
- **Suratlar:** Radium Girls factory 1920s photo (PD); Undark radium watch dial; Radium advertisement 1920s (PD reklama)

### 8. 2026-11-30 — The Heist Ruined by a Sandwich
- **Ilmoq:** _In 2003, thieves broke into one of the most secure vaults on Earth. A half-eaten sandwich gave them away._
- **Maydon:** Seyf xonasining ko'k chizmasi (yer osti qavatlari, himoya qatlamlari ro'yxati); ofis ijara shartnomasi; soxta savdogar vizitkasi; ochilgan seyf qutilari to'ri (X belgilari); o'rmonga tashlangan axlat qopi — ichidagilar maydonga sochiladi (sendvich, video kassetalar, kvitansiya); DNK kartasi; hukm
- **Suratlar:** (Zamonaviy voqea — PD suratlar deyarli yo'q; hammasi kodda chiziladi); Antwerp diamond district (faqat CC0 bo'lsa)

### 9. 2026-12-01 — The Town That Could Not Stop Dancing
- **Ilmoq:** _In the summer of 1518, a woman stepped into a street in Strasbourg and began to dance. She could not stop._
- **Maydon:** O'rta asr Strasburg shahar xaritasi; xronika qo'lyozma sahifasi; shahar kengashi farmoni (muhr bilan); sahna va musiqachilar eskizi; ishtirokchilar soni hisoblagichi; Sen-Vit ziyoratgohi marshruti; sabablar kartasi (ochlik, kasallik, ommaviy psixoz); XVI asr gravyurasi
- **Suratlar:** Hendrik Hondius, dancing mania engraving after Bruegel (1642, PD); Strasbourg 16th century map / view (PD); Medieval chronicle page (PD)

### 10. 2026-12-02 — The Healthy Woman Who Spread a Deadly Disease
- **Ilmoq:** _She was never sick a day in her life. But wherever she cooked, people fell ill._
- **Maydon:** Nyu-York va Long-Aylend xaritasi (oilalar belgilari); oshpaz ish tarixi kartochkalari; sanitariya muhandisining daftari; laboratoriya tahlil varaqlari; 1909-yilgi gazeta illyustratsiyasi; Shimoliy Aka-uka oroli xaritasi; "Mrs. Brown" ismli ish arizasi; kasalxona yozuvlari
- **Suratlar:** Mary Mallon in hospital 1909 (New York American, PD); "Typhoid Mary" newspaper illustration 1909 (PD); North Brother Island Riverside Hospital old photo (PD); George Soper portrait (PD)
