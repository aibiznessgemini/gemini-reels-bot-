# Daily Film Agent

Har kuni soat 00:00 da (Toshkent vaqti) Claude o'zi 2–3 daqiqalik 3D animatsion film tayyorlaydi:
mavzu, ssenariy, ElevenLabs diktor ovozi, kod bilan yozilgan musiqa va SFX, render, muqova va sarlavhalar.
Tayyor video Telegram orqali egasiga keladi va Google Drive'ga arxivlanadi. YouTube'ga egasi o'zi yuklaydi.

- Qoidalar: [`CLAUDE.md`](CLAUDE.md)
- Kundalik ish tartibi: [`docs/DAILY.md`](docs/DAILY.md)
- Mavzular banki: [`docs/topics.md`](docs/topics.md)
- Bitta film = bitta fayl: `film/films/<slug>/film.json`

Qo'lda bitta filmni render qilish:

```bash
cd film && npm ci
node --no-warnings pipeline/voice.ts <slug>
pipeline/render.sh <slug>
pipeline/telegram.sh <slug>
```

`bot.py` — eski Gemini bot, endi ishlatilmaydi.
