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

- `timeline.js`: Rute, stop, tekster og lydsignaler. Alt beregnes ud fra rejsens tid `t`. Samme `t` giver samme billede.
- `clock.js`: Udskifteligt ur (lokalt nu, senere lydspor eller fælles server-ur).
- `capsule.js`: Kabinen med 10 sæder (5 rækker à 2), skilt med årstal, tablets og tågeskal til tidsspring/komfort.
- `world.js`: Terræn, himmel, træer. `jelling.js`: Rejse 1 (bygninger, figurer, hund). `people.js`: figurbygger.
- `audio.js`: Pladsholderlyd med Web Audio. `hands.js`: Brugerens hænder. `ui.js`: Startside og taster.
- Nye rejser: én fil pr. sted/tid som `jelling.js` plus et manuskript i tidslinjen.

## Komfort (ufravigeligt)

- Kabinen er altid synlig og står stille i forhold til brugeren. Horisonten er vandret.
- Højst 2 m/s og under 10° drejning pr. sekund, bløde starter og stop. Grænser i `config.js`.
- Tidsspring: lyset skifter, men mønstret bevæger sig ikke (ingen tunnel-fart).
- Komforttilstand: tåge udenfor, mens kapslen flytter sig.
- Mindst 72 fps på Quest 3: få draw calls, ingen realtidsskygger.

## Idéer til senere

- Tablets med ægte billeder fra tiden (fx Jellingstenen i dag, fund fra vikingetiden) og små opgaver.
- Speak fra Rasmus som master-lydspor.
- Fælles afgang for hele klassen (som Mars-bussen trin 2-3).
- Flere rejser: fx stenalder, middelalderborg, Christian 4.'s København.
