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

## Idéen kort

Tidsmaskinen skifter fra en guidet tur til en undersøgelse: eleverne forlader kapslen, scanner spor på en øde plads i Jelling og skal selv finde ud af, hvor og hvornår de er.

Testen i Quest 3 viste, at teknikken holder, men at mennesker og dyr afslører simulationen. Animationerne kan forbedres, men i en browser bliver levende figurer aldrig helt troværdige. Bygninger, redskaber og landskab tåler derimod den stiliserede stil.

Ved at fjerne de levende figurer forsvinder det svageste led, og eleverne går fra at være tilskuere til at være detektiver. Det giver samtidig luft i trekantbudgettet.

## Rammefortællingen

Eleverne er tidsrejsende detektiver, hvis kapsel er landet et ukendt sted i fortiden. Opgaven er at finde ud af hvor, hvornår og hvad der er ved at ske.

**Regel nr. 1 bliver en spilmekanik.** *Rør intet. Ændr intet.* gælder stadig. Eleverne tager ikke genstande med, de scanner dem. Laboratoriet arbejder på kopier, og originalerne bliver liggende.

**Pladsen er nyligt forladt, ikke død.** Tomheden skal føles som et mysterium. Der ryger fra et ildsted, en økse sidder i brændeklodsen, væven er halvfærdig, og der er hovspor i mudderet. Lydbilledet designes senere af Rasmus og indgår ikke i de første milepæle. Hvorfor pladsen er tom, forklares ikke.

## Oplevelsens forløb

1. Landing i kapslen.
2. Eleven vælger en zone på panelet.
3. Kapslen springer i tåge til zonen.
4. Døren åbner. Eleven går ud og scanner spor.
5. Tilbage i kapslen: laboratoriet viser analyserne.
6. Klar til et bud? Nej: vælg en ny zone (tilbage til 2). Ja: bud i logbogen.
7. Hjemrejse.
8. Samtale i klassen (sker uden for appen).

## Kapslen

Kapslen er base og arbejdsrum. Den beholder Villeneuve-stilen og panelerne langs vinduerne, men panelerne får nye opgaver.

| Panel | Funktion |
| --- | --- |
| Zonevalg | Eleven vælger, hvilket sted på pladsen der skal undersøges. Kapslen springer i tåge og lander ved zonen. |
| Kort | Starter som verdenskort uden markering. Kan zoomes ind. Eventuelt sløret, indtil nok spor er scannet. |
| Laboratorium | Viser de scannede genstande og analyserne af dem. Her samles brudstykkerne. |
| Status | Årstal står som ukendt. Stealth-status bevares. |
| Logbog | Elevens foreløbige bud på tid, sted og forandring, koblet til genstande. |

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

## Afslutning uden facitliste

Turen slutter med et foreløbigt bud i logbogen, og appen siger aldrig, om det er rigtigt. Eleven udfylder *Hvornår er vi?*, *Hvor er vi?* og *Hvad er ved at ændre sig?* og trækker understøttende genstande ind. Et felt kan stå som "ved ikke". Buddet gemmes og kan eksporteres til læreren.

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
| Gemt bud | Ny | Lokalt i browseren, eksport som tekst eller billede |

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
3. Logbog med bud og eksport.
4. Fuld pc-, tablet- og mobilstyring.
5. Elevtest i Quest 3 og på Chromebook.
