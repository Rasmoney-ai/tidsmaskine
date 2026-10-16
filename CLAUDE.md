# Tidsmaskinen

> **Ny retning:** Læs `DESIGN.md` først. Den er styrende frem for tidligere beslutninger her og i `MODELLER.md`. Oplevelsen er nu en detektivopgave på en øde plads: ingen figurer eller dyr, eleverne går ud af kapslen og scanner spor.

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

- `timeline.js`: Ekspeditionen er en række klip: intro, tidsspring, landing, tågespring mellem zoner og tidsspring hjem. Tilstanden er (klip, tid i klippet). Kapslen flytter sig kun, når eleven vælger en zone (Landsbyen, Gravhøjene, Runestenen, Palisaden). Døren åbner, når kapslen står stille i en zone.
- `clock.js`: Udskifteligt ur (lokalt nu, senere lydspor eller fælles server-ur).
- `capsule.js`: Ottekantet glaskapsel i ren Villeneuve-stil (mørk grafit, mat beton, tynde lyslinjer, få ravfarvede accenter). Bygges i koden og ses kun indefra. Ingen møbler: man kan gå rundt. Skærmpaneler langs vinduerne (guide med stedknapper, kort, status, arkiv), lysring under ovenlyset og tågeskal til tidsspring/komfort. 10 startpladser (`seatPosition`). På skærmen går man med W A S D.
- `world.js`: Terræn (ingen græsstrå, kun farvede flader), himmel, træer. `jelling.js`: pladsen uden mennesker og dyr, opdelt i zonegrupper (village, mounds, stone, always), spor af liv (røg, økse i klodsen, halvfærdig væv, hovspor) og scanbare genstande. `people.js` og `life.js` bruges ikke længere.
- `shadows.js`: Falske bløde skygger. `scanner.js`: Håndscanner (stråle i VR, klik på pc); scannede genstande lyser svagt.
- `data/jelling.json`: Genstande og analyser til laboratoriepanelet. Nye genstande tilføjes her uden kodeændringer.
- `perf.js`: Måler (`?debug=1`) og sikkerhedsnet, der skruer ned for detaljer, hvis billedfrekvensen falder i VR.
- `audio.js`: Pladsholderlyd med Web Audio, slået fra som standard (`?sound=1` slår den til). Lyddesign laves senere af Rasmus. Tilføj ingen nye lyde. `hands.js`: Brugerens hænder. `ui.js`: Startside og taster.
- Nye rejser: én fil pr. sted/tid som `jelling.js` plus et manuskript i tidslinjen.

## Komfort (ufravigeligt)

- Kabinen er altid synlig og står stille i forhold til brugeren. Horisonten er vandret.
- Kapslen glider kun kort og langsomt (ca. 1,2 m/s, lige linje, bløde starter og stop). Ingen rotation. Grænser i `config.js`.
- Tidsspring: lyset skifter, men mønstret bevæger sig ikke (ingen tunnel-fart).
- Komforttilstand: kapslen står helt stille ved hvert sted.
- Mindst 72 fps på Quest 3: få draw calls, ingen realtidsskygger. Budget pr. sted: ca. 150.000 trekanter og 80 tegneopkald (`PERF` i `config.js`). Tjek med `?debug=1`.

## 3D-modeller

- Bestillingslisten står i `MODELLER.md`: GLB, ét mesh og ét materiale pr. model, figurer i T-pose med Mixamo-skelet.
- Færdige modeller fra Claude Design (ids som i `MODELLER.md`) ligger i `models/`. Figurer og dyr er flyttet til `models/figurer/` og indlæses ikke og indlæses af `src/models.js` (GLTFLoader r170 i `vendor/`). Mangler en fil, bruges pladsholderen fra koden.
- Statiske modeller slås sammen til ét mesh og gentages med instancing (træer, sten, palisade, hegn, får). Figurer styres med `Humanoid` (arme, hænder, gang) og dyr med `quadruped`.
- Runestenens malede side A (runerne) drejes mod kapslen med `RUNE_FACE_YAW` i `jelling.js`.
- Figurer animeres i koden ved at dreje knoglerne (`aimBone`). Flere kopier af samme figur med skelet laves med SkeletonUtils (`riggedCharacter(gltf, true)`), fx de fem får.
- Test: `?mute=1` slår lyden fra, og `app.inspect = [x, y, z, tx, ty, tz]` i konsollen giver et frit kamera til at se på modeller.

## Idéer til senere

- Tablets med ægte billeder fra tiden (fx Jellingstenen i dag, fund fra vikingetiden) og små opgaver.
- Speak fra Rasmus som master-lydspor.
- Fælles afgang for hele klassen (som Mars-bussen trin 2-3).
- Flere rejser: fx stenalder, middelalderborg, Christian 4.'s København.
