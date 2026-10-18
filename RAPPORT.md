# Rapport – milepæl 6

**Gren:** `milepael-6` (lavet fra `main` = milepæl 5). Efter aftale med Rasmus er `main` flyttet frem til grenen, så han kan teste i brillen.

## Bygget

1. **Ingen årstal på tidslinjen.** Tidslinjen viste allerede ingen årstal, hverken i logbogen eller på rejsekortet: kun periodebilleder, elevens markør og sporenes bånd. Årstallene bruges kun internt til placering (`yearToT` i `evidence.js`). Robottens replik nævner stadig årstallet. Ingen kodeændring var nødvendig. Reglen står nu i CLAUDE.md.
2. **Intet sædevalg.** Sædeknapperne på startsiden, `?seat=`, tasterne 1-0 og "plads" i statuslinjen er fjernet. Eleven starter altid samme sted (`START` i `config.js`, lige bag midten) med terminalen foran og døren forude.
3. **Halvt så stor kapsel.** `CAPSULE.RADIUS` er 1,85 m (ca. 3,7 m i diameter). Højden er uændret.
   - **Døren:** radius 0,58 m (før 1,0 m), centrum i 1,0 m højde, så den passer i én side. Skilt og ramme er skaleret med.
   - **Kulissepaneler:** fem i stedet for syv. Siderne ved døren er fri, så udsigten og døren ikke er spærret. Konsoller og skærme er mindre og står tættere på glasset.
   - **Gulv og loft:** gulvringe, ovenlysets ramme og lysringen er skaleret ned.
   - **Bevægelse:** gå-radius indenfor på pc er 1,2 m, og pladsen udenfor ligger 3,0 m fra midten (før 5,2 m). Panelet "Tilbage til kapslen" er flyttet med.
4. **jelling.json:** `placePhrases.revealed` er nu "i Jelling, i et land, som stenen kalder TANMAURK". Intet andet i filen er rørt.
5. DESIGN.md og CLAUDE.md er opdateret.

## Testet (desktop-tilstand i browseren)

- Startsiden har kun "Gå ind i VR" og "Se på skærmen". Eleven står foran terminalen, og fanerne kan bruges.
- Kapslen indefra mod fronten, siden og bagud: Døren ses forude over terminalen, og panelerne passer.
- Døren: ud og ind virker i Landsbyen, Gravhøjene, Runestenen og Palisaden. Udenfor står eleven frit i alle fire zoner, ikke inde i noget.
- Kapslen set udefra (frit kamera) ved alle fire zoner og landingspladsen: Den står frit og ikke inde i bygninger, høje eller sten.
- Trekanter i Landsbyen: ca. 135k, altså uændret og under 150k.
- I en frisk fane er der ingen fejl i konsollen. Den gamle fane viste en fejl fra en tidligere indlæsning i browserens cache.

## Kendte mangler

- Døren er nu ca. 1,16 m høj (fra 0,42 til 1,58 m), fordi den skal passe i en side på 1,4 m. Ud og ind sker med en fade, så man går ikke fysisk igennem, men den ser lav ud for en voksen.
- Pladsen udenfor er rykket tættere på kapslen. Sporene i hver zone står samme sted som før, så nogle kan være lidt længere væk end før (scanneren rækker 16 m).
- Passthrough er stadig slået fra.

## Prøv i brillen

1. Start: Står du foran terminalen med døren lige forude? Passer kapslen bedre til lokalet?
2. Kan du nå terminalen og alle fanerne uden at gå?
3. Gå ud og ind ad døren i et par zoner. Føles døren for lille?
4. Udenfor: Kan du nå at scanne sporene fra pladsen foran døren?
5. Bevisfasen: Står robottens replik nu som "i Jelling, i et land, som stenen kalder TANMAURK"?

## Afvigelser fra prompten

- **Punkt 1 krævede ingen ændring.** Tidslinjen viste allerede ingen årstal.
- **To kulissepaneler er fjernet** (siderne ved døren), fordi syv paneler ikke kunne være i den mindre kapsel uden at spærre for døren og udsigten.
