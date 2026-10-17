# Tidsmaskinen

Historieoplevelse til Meta Quest 3 (Quest Browser) og pc i browseren, som en detektivopgave. Eleverne er tidsrejsende detektiver, hvis kapsel lander et ukendt sted i fortiden: Jelling, ca. år 968, uden at det bliver sagt. De vælger en zone, går ud af kapslen på en nyligt forladt plads uden mennesker og dyr, scanner spor med en håndscanner og samler analyserne i kapslens laboratorium. Opgaven er selv at finde ud af hvor, hvornår og hvad der er ved at ske. Appen giver spor, aldrig svar.

Inspireret af Ray Bradburys "A Sound of Thunder". Regel nr. 1, "Rør intet. Ændr intet.", er en spilmekanik: Eleverne tager ikke ting med, de scanner dem.

**`DESIGN.md` er styrende.** Læs den først. Den går forud for tidligere beslutninger her og i `MODELLER.md`. Byg i små milepæle, og rør kun det, den aktuelle opgave beder om.

Projektejer: Rasmus (lærer). Han tester i en Quest 3 og foretrækker enkle, velfungerende løsninger.

## Arbejdsform

- Tal dansk med Rasmus, kort og i klart sprog uden kodejargon. Kode, filnavne og kommentarer på engelsk. Al tekst, eleverne ser, er på dansk.
- Små afsluttede bidder, der kan testes hver for sig. Tjek selv i browseren (desktop-tilstand) og konsollen, før du afleverer.
- Spørg, før du tilføjer afhængigheder, byggeværktøjer eller eksterne tjenester.
- Repoet er offentligt: ingen hemmeligheder eller persondata.
- Elevtekster (zonevalg, laboratoriet) ligger i `src/timeline.js` og `data/jelling.json`. Teksterne må ikke afsløre sted eller årstal. Det gamle manuskript til den guidede tur ligger i `arkiv/`.

## Teknik

- Statisk side uden byggetrin: `index.html`, ES-moduler, three.js r170 i `vendor/` (import map: `three`).
- Lokal test: `python -m http.server 8137` og åbn `http://localhost:8137`. Hosting: GitHub Pages fra `main` med relative stier og `.nojekyll`.
- Reference space `local-floor`, hand tracking valgfri, ingen controllere nødvendige.

## Arkitektur

- `timeline.js`: Ekspeditionen er en række klip: intro, tidsspring, landing, tågespring mellem zoner og tidsspring hjem. Tilstanden er (klip, tid i klippet). Kapslen flytter sig kun, når eleven vælger en zone (Landsbyen, Gravhøjene, Runestenen, Palisaden). Døren åbner, når kapslen står stille i en zone.
- `clock.js`: Udskifteligt ur (lokalt nu, senere lydspor eller fælles server-ur).
- `capsule.js`: Ottekantet glaskapsel i ren Villeneuve-stil (mørk grafit, mat beton, tynde lyslinjer, få ravfarvede accenter). Bygges i koden og ses kun indefra; udenfor er den i stealth, og kun dørrammen og et panel til at gå ind igen ses. Ingen møbler. Rund dør i frontvæggen (tidsportal), der åbner som en iris; udefra ses kapslens indre kun gennem døren (stencil). Skærmpaneler langs vinduerne: zonevalg, kort, status (årstal ukendt) og laboratorium. Lysring under ovenlyset og tågeskal til spring. 10 startpladser (`seatPosition`). På skærmen går man med W A S D.
- `terminal.js`: Den ene terminal foran startpladsen med symbolfaner (zonevalg, kort, laboratorium, logbog), logbogens tre felter (nål, tidslinje-markør, ≠-par, beviser), rejsekortet og træk/tryk med mus eller VR-stråle. Buddet gemmes i `localStorage` (`tidsmaskinen.bud`) ved hjemrejse. Panelerne langs vinduerne er kulisse.
- `icons.js`: Fælles symboler tegnet i canvas (genstande, analysetyper, perioder, faner, zoner) og et navnløst Nordeuropa-kort. Princip: få ord, symboler frem for tekst.
- `world.js`: Terræn (ingen græsstrå, kun farvede flader), himmel og træer. `jelling.js`: pladsen uden mennesker og dyr, opdelt i zonegrupper (village, mounds, stone, always), spor af liv (røg, økse i klodsen, halvfærdig væv, hovspor) og scanbare genstande.
- `scanner.js`: Håndholdt scanner (i højre hånd/controller i VR, nederst i billedet på pc udenfor). Stråle fra scannerens spids. Ved scanning flyver et blåt hologram op, forstørres og drejer foran eleven og suser ind i scanneren; først derefter står genstanden i laboratoriet. Scannede genstande lyser svagt; hver scanbar genstand har sit eget materiale.
- `data/jelling.json`: De 13 genstande med analyser (godkendt indhold: ret ikke i teksterne). `trace: her` gør kortet skarpere, `trace: ud` tegner en linje mod kortkanten (`link.region` → retning, `link.label` → tekst). Placeringen i scenen står i `jelling.js` (`scannable(...)`).
- Laboratoriepanelet viser én genstand ad gangen med alle analyser; pilene bladrer. Kortet starter sløret.
- `shadows.js`: Falske bløde skygger. `perf.js`: Måler (`?debug=1`) og sikkerhedsnet, der skruer ned for detaljer, hvis billedfrekvensen falder i VR.
- `audio.js`: Pladsholderlyd med Web Audio, slået fra som standard (`?sound=1` slår den til). Lyddesign laves senere af Rasmus. Tilføj ingen nye lyde. `hands.js`: Brugerens hænder. `ui.js`: Startside og taster.
- Nye rejser: én fil pr. sted/tid som `jelling.js` plus en datafil som `data/jelling.json`.

## Komfort (ufravigeligt)

- Kabinen er altid synlig og står stille i forhold til brugeren. Horisonten er vandret.
- Kapslen står stille i hver zone; den flytter sig kun ved et tågespring. Ud og ind ad døren sker med en kort fade.
- Tidsspring: lyset skifter, men mønstret bevæger sig ikke (ingen tunnel-fart).
- Mindst 72 fps på Quest 3: få draw calls, ingen realtidsskygger. Budget pr. zone: under 150.000 trekanter og ca. 80 tegneopkald (`PERF` i `config.js`). Tjek med `?debug=1`.
- Hver zone skal kunne undersøges på ca. 2 × 2 m med drejning, så den også virker hjemme.

## 3D-modeller

- Bygninger, redskaber og natur er lavet af Claude Design (ids som i `MODELLER.md`) og ligger i `models/`. De indlæses af `src/models.js` (GLTFLoader r170 i `vendor/`). Mangler en fil, bruges pladsholderen fra koden.
- Figurer og dyr bruges ikke i denne version. Deres filer er flyttet til `models/figurer/` og indlæses ikke.
- Statiske modeller slås sammen til ét mesh og gentages med instancing (træer, sten, palisade, hegn).
- Runestenens malede side A (runerne) drejes mod kapslen med `RUNE_FACE_YAW` i `jelling.js`.
- Test: `app.inspect = [x, y, z, tx, ty, tz]` i konsollen giver et frit kamera til at se på modeller.

## Idéer til senere (se milepælene i `DESIGN.md`)

- Flere genstande pr. zone og proveniens på kortet.
- Eksport af buddet til læreren.
- Fuld pc-, tablet- og mobilstyring.
- Lyddesign og speak fra Rasmus.
