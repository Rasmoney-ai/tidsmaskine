# Tidsmaskinen

VR-oplevelse til historieundervisning på Meta Quest 3 (Quest Browser). Eleverne sidder i en tidskapsel, der glider usynligt ("stealth") gennem fortiden, mens en tablet foran hver plads fortæller om det, de ser. Inspireret af Ray Bradburys "A Sound of Thunder": Regel nr. 1 er "Rør intet. Ændr intet."

Projektejer: Rasmus (lærer). Han tester i en Quest 3 og foretrækker enkle, velfungerende løsninger.

## Arbejdsform

- Tal dansk med Rasmus, kort og i klart sprog uden kodejargon. Kode, filnavne og kommentarer på engelsk. Al tekst, eleverne ser, er på dansk.
- Små afsluttede bidder, der kan testes hver for sig. Tjek selv i browseren (desktop-tilstand) og konsollen, før du afleverer.
- Spørg, før du tilføjer afhængigheder, byggeværktøjer eller eksterne tjenester.
- Repoet bliver offentligt: ingen hemmeligheder eller persondata.
- Manuskriptet ligger i `MANUSKRIPT.md`. Hold det i takt med teksterne i `src/timeline.js`.

## Teknik

- Statisk side uden byggetrin: `index.html`, ES-moduler, three.js r170 i `vendor/` (import map: `three`).
- Lokal test: `python -m http.server 8137` og åbn `http://localhost:8137`. Hosting: GitHub Pages med relative stier og `.nojekyll`.
- Reference space `local-floor`, hand tracking valgfri, ingen controllere nødvendige.

## Arkitektur

- `timeline.js`: Rejsen er en række klip: intro, tidsspring, tre steder (stop), korte tidshop og tidsspring hjem. Tilstanden er (klip, tid i klippet). Samme tilstand giver samme billede. Ved hvert sted glider kapslen kort og står så stille. Man vælger sted på tabletten, og ellers kører stederne i rækkefølge.
- `clock.js`: Udskifteligt ur (lokalt nu, senere lydspor eller fælles server-ur).
- `capsule.js`: Ottekantet glaskapsel i ren Villeneuve-stil (mørk grafit, mat beton, tynde lyslinjer, få ravfarvede accenter). Bygges i koden og ses kun indefra. Ingen møbler: man kan gå rundt. Skærmpaneler langs vinduerne (guide med stedknapper, kort, status, arkiv), lysring under ovenlyset og tågeskal til tidsspring/komfort. 10 startpladser (`seatPosition`). På skærmen går man med W A S D.
- `world.js`: Terræn (ingen græsstrå, kun farvede flader), himmel, træer. `jelling.js`: Rejse 1, opdelt i zoner (village, mounds, stone, always). Hvert sted viser og animerer kun sine zoner. `people.js`: figurbygger (pladsholdere indtil modellerne fra `MODELLER.md` kommer).
- `shadows.js`: Falske bløde skygger. `life.js`: Fugle og sommerfugle.
- `perf.js`: Måler (`?debug=1`) og sikkerhedsnet, der skruer ned for detaljer, hvis billedfrekvensen falder i VR.
- `audio.js`: Pladsholderlyd med Web Audio. `hands.js`: Brugerens hænder. `ui.js`: Startside og taster.
- Nye rejser: én fil pr. sted/tid som `jelling.js` plus et manuskript i tidslinjen.

## Komfort (ufravigeligt)

- Kabinen er altid synlig og står stille i forhold til brugeren. Horisonten er vandret.
- Kapslen glider kun kort og langsomt (ca. 1,2 m/s, lige linje, bløde starter og stop). Ingen rotation. Grænser i `config.js`.
- Tidsspring: lyset skifter, men mønstret bevæger sig ikke (ingen tunnel-fart).
- Komforttilstand: kapslen står helt stille ved hvert sted.
- Mindst 72 fps på Quest 3: få draw calls, ingen realtidsskygger. Budget pr. sted: ca. 150.000 trekanter og 80 tegneopkald (`PERF` i `config.js`). Tjek med `?debug=1`.

## 3D-modeller

- Bestillingslisten står i `MODELLER.md`: GLB, ét mesh og ét materiale pr. model, figurer i T-pose med Mixamo-skelet.
- Færdige modeller ligger i `models/` og indlæses af `src/models.js` (GLTFLoader r170 i `vendor/`). Mangler en fil, bruges pladsholderen fra koden.
- Figurer animeres i koden ved at dreje knoglerne (`aimBone`). Flere kopier af samme figur kræver SkeletonUtils (spørg først).
- Test: `?mute=1` slår lyden fra, og `app.inspect = [x, y, z, tx, ty, tz]` i konsollen giver et frit kamera til at se på modeller.

## Idéer til senere

- Tablets med ægte billeder fra tiden (fx Jellingstenen i dag, fund fra vikingetiden) og små opgaver.
- Speak fra Rasmus som master-lydspor.
- Fælles afgang for hele klassen (som Mars-bussen trin 2-3).
- Flere rejser: fx stenalder, middelalderborg, Christian 4.'s København.
