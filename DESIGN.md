# Tidsmaskinen – Jelling som detektivopgave

Designdokument, 16. oktober 2026 · Rasmus Broe

## Til Claude Code: hvad er nyt

Koden i dette repo bygger på den **gamle version**: en guidet tur, hvor eleverne sidder i kapslen og ser animerede mennesker og dyr i Jelling ca. 968. Den version er testet i Quest 3 og virker teknisk, men retningen er nu ændret.

**Den nye version er en detektivopgave.** Eleverne forlader kapslen, undersøger en øde plads, scanner spor og skal selv finde ud af, hvor og hvornår de er. Det betyder:

- **Udgår:** de 14 figurer, hund, okse og får, deres animationer, Mixamo-spørgsmålet, den guidede fortælling og manuskriptet med hunden, der opdager kapslen.
- **Genbruges:** stop-scener, tågespring, zoner, ydelsesmåler (`?debug=1`), automatisk nedskalering, bygninger og redskaber fra `MODELLER.md`, Villeneuve-kapslen og panelerne langs vinduerne.
- **Nyt:** døren ud af kapslen, håndscanner, laboratoriepanel, logbog, kort med zoom, fuld pc- og mobilstyring.
- **Lyd:** tilføj ingen nye lyde. Lyddesign laves senere af Rasmus.

Byg i små milepæle. Rør kun det, den aktuelle opgave beder om.

## Princip: få ord

Så lidt tekst som muligt. Symboler, billeder og placering bærer betydningen; ord bruges kun, hvor intet symbol kan gøre arbejdet. Al elevtekst er på dansk.

- Faner, knapper og analyseoverskrifter er symboler (fx krystal for materiale, kompas for oprindelse, årringe for alder, lup for spor).
- Et tomt felt vises med "?".
- Analyseteksterne skrives korte og talte, så de senere kan erstattes af speak uden at ændre indholdet.

## Idéen kort

Tidsmaskinen skifter fra en guidet tur til en undersøgelse: eleverne forlader kapslen, scanner spor på en øde plads i Jelling og skal selv finde ud af, hvor og hvornår de er.

Testen i Quest 3 viste, at teknikken holder, men at mennesker og dyr afslører simulationen. Animationerne kan forbedres, men i en browser bliver levende figurer aldrig helt troværdige. Bygninger, redskaber og landskab tåler derimod den stiliserede stil.

Ved at fjerne de levende figurer forsvinder det svageste led, og eleverne går fra at være tilskuere til at være detektiver. Det giver samtidig luft i trekantbudgettet.

## Nutiden er passthrough

I Quest 3 starter oplevelsen med passthrough: før afrejse og efter hjemkomst ses det rigtige klasselokale gennem kapslens vinduer. Ved tidsspringet dækker tågen klasselokalet, og derefter kommer fortiden frem. Ved hjemkomst letter tågen, og klasselokalet er tilbage. Kapslens vægge, gulv og loft er altid uigennemsigtige, så kun vinduerne viser omverdenen. Uden passthrough (pc eller ældre briller) vises nutiden som mørk, rolig tåge.

Eleverne ser deres egne hænder som realistiske hænder (three.js' håndmodel), der virker med scanneren og logbogen.

## Rammefortællingen

Eleverne er tidsrejsende detektiver, hvis kapsel er landet et ukendt sted i fortiden. Opgaven er at finde ud af hvor, hvornår og hvad der er ved at ske.

**Regel nr. 1 bliver en spilmekanik.** *Rør intet. Ændr intet.* gælder stadig. Eleverne tager ikke genstande med, de scanner dem. Laboratoriet arbejder på kopier, og originalerne bliver liggende.

**Pladsen er nyligt forladt, ikke død.** Tomheden skal føles som et mysterium. Der ryger fra et ildsted, en økse sidder i brændeklodsen, væven er halvfærdig, og der er hovspor i mudderet. Lydbilledet designes senere af Rasmus og indgår ikke i de første milepæle. Hvorfor pladsen er tom, forklares ikke.

## Oplevelsens forløb

1. Afgang fra klasselokalet (passthrough), tidsspring og landing.
2. Eleven vælger en zone på terminalen.
3. Kapslen springer i tåge til zonen.
4. Døren åbner. Eleven går ud og scanner spor.
5. Tilbage i kapslen: laboratoriet viser analyserne.
6. Klar til et bud? Nej: vælg en ny zone (tilbage til 2). Ja: gæt og beviser i logbogen.
7. Hjemrejse: tågen letter, og klasselokalet ses igen.
8. Samtale i klassen (sker uden for appen).

## Kapslen

Kapslen er base og arbejdsrum i Villeneuve-stil, ca. 3,7 m i diameter, så den passer bedre til et klasselokale. Eleven starter altid samme sted, lige foran terminalen med døren forude; der er intet sædevalg. **Al betjening sker på én terminal**, så alt kan nås inden for 2 × 2 meter. Nederst på terminalen er fire symbolfaner:

| Fane | Funktion |
| --- | --- |
| Zonevalg | Fire billedfliser (Landsbyen, Gravhøjene, Runestenen, Palisaden) samt dør og hjemrejse. Kapslen springer i tåge og lander ved zonen. |
| Kort | Pladsen, sløret til at begynde med. Bliver skarpere med spor, der peger på *her*, og får linjer mod kanten for spor, der peger *ud*. |
| Laboratorium | Én scannet genstand ad gangen med alle analyser; pile bladrer. Analyserne har symboler i stedet for overskrifter. |
| Logbog | Elevens gæt, bevisfasen og hjemrejsen (se nedenfor). |

Årstallet står som "????" i terminalens hjørne. Panelerne langs vinduerne bliver stående som kulisse.

Døren åbner kun, når kapslen står stille ved en zone. Kapslen ses stadig kun indefra.

## Zonerne på pladsen

Fire små zoner, en pr. stop, bygget på de eksisterende stop-scener. Hver zone skal kunne undersøges på cirka 2 × 2 meter med drejning, så den også virker hjemme.

| Zone | Hvad man ser | Genstande til scanning |
| --- | --- | --- |
| Landsbyen | Huse, ildsted, væv, brændestabel med økse i klodsen | Sølvmønt (på bænken ved ildstedet), vævevægt (under væven), hvæssesten (ved brændestablen), kam (i døråbningen til det store hus) |
| Gravhøjene | Nordhøjen og Sydhøjen, tørv stablet til byggeri, oksekærre | Tørveblok (i stablen), lille hammer (tabt i græsset), spade (stukket i jorden ved stablen) |
| Runestenen | Den store sten under arbejde, den lille sten, trækirken | Den store sten, den lille sten, lille kors (ved trækirken), mejsel (ved foden af den store sten) |
| Palisaden | Stolperækken, porten og hovspor i mudderet | Egestolpe (i rækken ved porten), økse (hugget fast i en brændeklods ved porten) |

Genstandene og analyserne ligger i `data/jelling.json` (13 genstande, milepæl 2). Hver genstand har feltet `trace`: `her` peger på stedet og gør kortet skarpere, `ud` peger på forbindelser udadtil og tegner en linje mod kortkanten i retning af `link.region` med teksten fra `link.label`.

Indholdet skal faktatjekkes af en fagperson før elevtest. Hver zone har to til fire genstande.

## Håndscanneren og laboratoriet

Scanneren peger og scanner, intet andet. Scannede genstande lyser svagt. Ikke-scanbare ting reagerer ikke.

Laboratoriet giver spor, aldrig svar. Eksempler på analyser:

- **Materiale:** "Sølv. Indskrift med et ukendt skrifttegn."
- **Oprindelse:** "Sølvet stammer fra et område langt mod øst."
- **Alder:** "Træet er fældet for cirka 1050 år siden, set fra din tid."
- **Tegn og billeder:** translitteration af runerne og en beskrivelse af figurerne på stenen.

Nogle spor peger bevidst i hver sin retning, fx Thorshammer og kors. Det er en spænding, der skal tales om, ikke en fejl.

### Proveniens: hvor kommer tingene fra?

- **Spor der peger på *her*:** jord, pollen, tørv og lokalt træ. Jo flere af disse, jo skarpere bliver kortet.
- **Spor der peger *ud*:** sølv (isotoper, miner mod øst), hvæssesten af skifer (Norge), rav (Østersøen). De tegner forbindelseslinjer ud over kortet.

Fundsted er ikke det samme som oprindelse. Analyserne formuleres forsigtigt: "passer med", "sandsynligvis".

## Logbogen

Tre trin, intet tastatur.

1. **Elevens gæt.** *Hvor?* En nål på et kort over Nordeuropa uden navne. *Hvornår?* En markør på en vandret tidslinje med perioder som små billeder (stenredskab, bronzeøkse, vikingeskib, borg, kirke med tårn, fabrik, nutid). Der vises intet årstal. Tomme felter vises med "?".
2. **Bevisfasen.** De scannede genstande ligger som billeder i en række. Eleven markerer en genstand ved at trykke på den (og fjerner markeringen ved at trykke igen). Hver markeret genstand lægger sin zone fra `evidence` i `data/jelling.json`: sit tidsinterval (`dating`) på tidslinjen og sit område (`zone` i `regions`) på kortet. Overlappet af tidsintervallerne og overlappet af "her"-zonerne fremhæves. "Ud"-zoner tegnes ved oprindelsen med en linje til overlappet af "her"-zonerne; ligger oprindelsen uden for kortet, peger en pil derhen fra kanten.
3. **Rejs hjem.** Prikker viser, hvor mange genstande der skal markeres (`evidence.minItems`). Trykker eleven for tidligt, siger kapslens robot "tooFew". Med nok genstande siger robotten "done" med tid og sted og derefter et åbent spørgsmål, og kapslen rejser hjem.

Feltet "Hvad ændrer sig?" (≠) er udgået.

## Afslutning uden facitliste

"Rejs hjem" virker, når mindst `evidence.minItems` genstande er markeret. Robottens replikker følger reglerne i `data/jelling.json`:

- **Tid:** overlappet af de markerede genstandes `dating`. Bredden vælger sætningen i `timePhrases` (`{from}`, `{to}`, `{mid}` udfyldes).
- **Sted:** `placePhrases.revealed`, hvis en markeret genstand har `revealsPlace`; ellers sætningen for den smalleste "her"-zone, hvis den findes (fx `jelling_egn`); ellers `default`.
- **Åbent spørgsmål:** `openQuestionBoth`, hvis både lille hammer og kors er markeret; ellers `openQuestionDefault`.

Robotten vises som tekst indtil videre; lyd og speak kommer senere.

Hjemme viser rejsekortet elevens gæt (nål og markør) ved siden af overlappet fra sporene, de markerede genstande og robottens åbne spørgsmål. Appen vurderer ikke gættet. Buddet (gæt, markerede genstande, tid og robottens replikker) gemmes lokalt i browseren. Eksport til læreren kommer senere.

## Pædagogisk ramme og fagplan

Oplevelsen er et fælles udgangspunkt; det vigtigste sker i samtalen bagefter. Designet er koblet til andet udkast til fagplan for historie (juni 2026), som træder i kraft i skoleåret 2027/2028. Jellingstenen er kanonpunkt. Kernen er indholdsområdet "Fortællinger og spor": spor bliver kilder, når de bruges til at besvare en historisk problemstilling.

## Teknik

| Del | Status | Bemærkning |
| --- | --- | --- |
| Stop-scener, tågespring, zoner | Genbruges | Bliver til zonevalg fra kapslen |
| Bygninger og ting (Claude Design) | Genbruges | Redskaberne bliver spor |
| 14 figurer og dyrene | Fjernes | Lyddesign kommer senere |
| Animationer og Mixamo-spørgsmålet | Bortfalder | Kun små ting bevæger sig: røg, ild, blade |
| Kapsel og paneler | Ændres | Nyt indhold på panelerne, dør der åbner |
| Håndscanner | Ny | Controller-stråle i VR, klik på desktop |
| Laboratorium og logbog | Ny | Data pr. genstand i en JSON-fil |
| Gemt bud | Ny | Lokalt i browseren (milepæl 3); eksport senere |

**Ydelse:** mål på 150.000 trekanter pr. zone. **Genstandsdata** ligger i en separat fil, så nye rejser kan tilføjes uden kodeændringer.

## Platforme: VR er ikke et krav

| Platform | Bevægelse | Scanning | Rolle |
| --- | --- | --- | --- |
| Quest 3 (WebXR) | Gå i zonen, drej med kroppen | Controller-stråle eller hånd | Fuld oplevelse i klassen |
| Pc/Chromebook i browser | Mus og tastatur, klik for at kigge rundt | Klik på genstand | Hovedplatform for skoler uden VR |
| Tablet og mobil | Træk med fingeren eller drej enheden | Tryk på genstand | Flipped learning, gruppearbejde |

Ét fælles indholdsformat på alle platforme. Grænsefladen skal kunne læses på en lille skærm. Ydelsen testes også på en billig Chromebook.

## Milepæle

1. Fjern figurer og dyr, tilføj visuelle spor af liv, zonevalg og dør ud, én scanbar genstand, laboratoriepanel med én analyse fra JSON.
2. Flere genstande pr. zone og proveniens på kortet.
3. Én terminal med symbolfaner, symboler i laboratoriet, logbog med tre felter, rejsekort og gemt bud. (Eksport venter.)
4. Passthrough som nutid og three.js-hænder (passthrough midlertidigt slået fra).
5. Bevisfasen: markerede genstande lægger zoner på kort og tidslinje, robotten opsummerer, nyt rejsekort.
6. Halvt så stor kapsel (ca. 3,7 m), fast startplads foran terminalen, ingen årstal på tidslinjen.
7. Fuld pc-, tablet- og mobilstyring.
8. Elevtest i Quest 3 og på Chromebook.
