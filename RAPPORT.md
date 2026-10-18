# Rapport – milepæl 5

**Gren:** `milepael-5` (lavet fra `main` = milepæl 4). Ikke flettet ind i `main`.

## Bygget

- **Ny `data/jelling.json`** fra Rasmus er lagt ind uændret.
- **Logbogen har tre trin** (`src/terminal.js`):
  - a) **Gæt:** nål på kortet og markør på tidslinjen, som før.
  - b) **Bevisfasen:** De scannede genstande ligger som billeder i en række. Et tryk markerer en genstand (grøn ramme og flueben), og et tryk mere fjerner markeringen. Hver markeret genstand lægger sit `dating`-interval på tidslinjen og sin zone fra `regions` på kortet. Overlappet af tidsintervallerne og overlappet af "her"-zonerne er fremhævet med stærk grøn. "Ud"-zoner tegnes stiplet ved oprindelsen med en linje til "her"-overlappet. Feltet "Hvad ændrer sig?" (≠) og de gamle beviskasser er fjernet.
  - c) **Rejs hjem:** Prikker viser, hvor mange genstande der mangler (`minItems` = 5). Trykker eleven for tidligt (også fra zonefanen), skifter terminalen til logbogen, og robotten siger "tooFew". Med nok genstande siger robotten "done" og det åbne spørgsmål. Under tidsspringet står replikken på hele terminalen.
- **Reglerne** ligger i et nyt modul, `src/evidence.js`, og læses fra filen: tidsoverlap, `timePhrases` efter overlappets bredde og `placePhrases`. "revealed" bruges, hvis en markeret genstand har `revealsPlace`. Ellers bruges sætningen for den smalleste "her"-zone, hvis den har en (`jelling_egn`), og ellers `default`. Til sidst `openQuestionBoth` eller `openQuestionDefault`.
- **Robotten** er et lille robotsymbol med en taleboks (kun tekst).
- **Rejsekortet:** elevens gæt (kort med nål) ved siden af sporene (kort med zoner og overlap). Tidslinjen viser både elevens markør og sporenes overlap. Under dem står de markerede genstande og robottens åbne spørgsmål. Ingen vurdering.
- **Gemt bud** i `localStorage` (`tidsmaskinen.bud`): nål, markør, markerede genstande, tidsoverlap og robottens replikker.
- DESIGN.md og CLAUDE.md er opdateret.

## Testet (desktop-tilstand i browseren)

- Rejs hjem uden markeringer giver "Markér mindst 5 mere." i logbogen.
- Med 7 markerede genstande (blandt andet store sten, lille hammer og kors) blev replikken: "… Vi er i Jelling. Stenen kalder landet TANMAURK, omkring år 968. …", efterfulgt af spørgsmålet om både hammer og kors. Rejsekortet og det gemte bud er tjekket.
- Reglerne er afprøvet direkte med flere kombinationer:
  - uden sten: "et sted i det sydlige Skandinavien, i et åbent landbrugslandskab, engang mellem år 900 og 1000"
  - bredt overlap: "i en tid, mine data endnu ikke kan bestemme præcist"
  - 960–1000: "i slutningen af 900-tallet"
  - for få genstande: "tooFew" med det rigtige antal.
- Ingen fejl i konsollen. 3D-scenen er ikke ændret, så trekanterne er som i milepæl 4 (under 150k pr. zone).

## Kendte mangler og valg

- **Årstal på tidslinjen:** Periodebillederne står med lige afstand, men årstallene gør ikke. Jeg har lagt årstal ind ved hvert billede i `evidence.js` (`ANCHOR_YEARS`: stenredskab −5000, bronzeøkse −1200, vikingeskib 950, borg 1250, kirke 1500, fabrik 1850, nutid 2026). Det placerer overlappet lige ved vikingeskibet. Tallene er mit forslag og kan rettes ét sted.
- **Meget smalle overlap** (fx 966–970) tegnes mindst 8 pixel brede med en ramme, så de kan ses.
- **Centralasien ligger uden for kortet** (kortet dækker Nordeuropa). Zonen markeres med en pil ved kortkanten i retning mod oprindelsen, og linjen går dertil.
- Kortet i logbogen er bredere end det oprindelige kortudsnit, så nålen kan sættes lidt uden for Nordeuropa. Rejsekortets kort har nu samme form, så nålen står samme sted.
- Robotten er kun tekst. Der er ingen lyd og ingen animation.
- Passthrough er stadig slået fra.

## Prøv i brillen

1. Scan mindst 5 ting i forskellige zoner. Åbn logbogen, sæt en nål og træk markøren.
2. Tryk "Rejs hjem" før du har markeret noget: Beder robotten om flere spor?
3. Tryk på genstandene i rækken: Bliver de markeret, og dukker zonerne op på kort og tidslinje? Er overlappet tydeligt? Kan du fjerne en markering igen?
4. Rejs hjem med 5 eller flere: Kan du læse robottens replik under springet?
5. Hjemme: Giver rejsekortet mening med dit gæt ved siden af sporene og det åbne spørgsmål?
6. Er knapper og genstande store nok at ramme med hånden?

## Afvigelser fra prompten

- **"Rejs hjem" kan trykkes, før der er markeret nok.** Så siger robotten "tooFew". Det er sådan, jeg har læst "Med for få genstande vises tooFew". Knappen lyser først op, når der er markeret nok.
- **Tidslinjens årstal** er ikke givet i prompten og er lagt ind som beskrevet ovenfor.
