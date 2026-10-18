# Rapport – milepæl 4

**Gren:** `milepael-4` (lavet fra `main` = milepæl 3). Ikke flettet ind i `main`.

## Bygget

- **Nutiden som passthrough.** Sessionen starter som `immersive-ar`, når brillen kan, ellers `immersive-vr`. Før afrejse og efter hjemkomst tegnes intet uden for kapslen (ingen himmel, intet terræn, ingen tåge), så klasselokalet ses gennem vinduerne. Ved tidsspringet toner tågen ind over klasselokalet (ca. 2,5 s), derefter kommer fortiden. Ved hjemkomst letter tågen til klasselokalet igen.
- **Uden passthrough** (pc, eller hvis AR ikke findes) er nutiden mørk, rolig tåge i stedet for det lyse laboratorie-hvide.
- **Kapslen er tæt:** Vægge, gulv og loft er uigennemsigtige. Ovenlyset i loftet var glas og er nu lukket med en mørk plade.
- **Hænder:** De hjemmelavede handsker er erstattet af three.js' `XRHandModelFactory` med 'mesh'-modellen. Koden ligger i `vendor/three/addons/webxr/` (three r170), modelfilerne `left.glb` og `right.glb` i `vendor/hands/` (fra @webxr-input-profiles/assets 1.0.18, MIT-licens medfølger). Intet hentes fra en CDN.
- Scanner og træk i logbogen bruger stadig input-kildernes pegestråle (knib), så de virker med hænderne som før.
- **Testhjælp:** `?passthrough=1` efterligner passthrough på pc (klasselokalet er en grå flade).
- DESIGN.md og CLAUDE.md er opdateret. Rapport-reglen er tilføjet under Arbejdsform i CLAUDE.md.

## Testet (desktop-tilstand i browseren)

- Uden passthrough: nutiden er mørk tåge, ingen fejl i konsollen.
- Med `?passthrough=1` og pink baggrund: Før afrejse ses baggrunden kun gennem vinduerne og døråbningens glas, ikke gennem gulv, vægge eller loft. Tidsspringet: tågen dækker, fortiden kommer frem. Hjemrejse: tågen letter til baggrunden.
- Håndmodellerne indlæses fra `vendor/hands/` (2.314 trekanter hver, med skelet).
- Trekanter pr. zone (målt med passthrough): Landsbyen 135k, Gravhøjene 128k, Runestenen 137k, Palisaden 138k. Med begge hænder højst ca. 143k, altså under 150k.

## Ikke testet / kendte mangler

- Passthrough og hænderne kan ikke afprøves på pc. Begge skal testes i brillen.
- Kapslen er stor (ca. 7,4 m i diameter). I et klasselokale vil klassens møbler og vægge kunne ses "inde i" kapslens vinduesfelter, hvis lokalet er mindre. Det er forventet med passthrough.
- Håndmodellen bruger three.js' standardmateriale (hudfarvet, lys fra scenen). Ingen "uhyggelige" hænder endnu.

## Prøv i brillen

1. Tryk "Gå ind i VR". Kan du se klasselokalet gennem kapslens vinduer, og er gulv og loft tætte?
2. Se tidsspringet: dækker tågen blødt, og kommer fortiden frem uden blink?
3. Hold hænderne op: ses de som realistiske hænder? Virker scanneren (knib) udenfor og træk i logbogen?
4. Rejs hjem: letter tågen til klasselokalet?
5. Tjek billedfrekvensen med `?debug=1`.

## Afvigelser fra prompten

- **Ovenlyset er lukket.** Det var glas, men prompten siger, at loftet altid er uigennemsigtigt.
- **Tilføjet `?passthrough=1`**, så passthrough kan efterlignes på pc. Det var ikke bestilt, men var nødvendigt for at teste i desktop-tilstand.
- **Tågen i kabinen** er slået fra i nutiden (også uden passthrough), så kapslen ikke farves mørk af den nye mørke tåge. Under springene er den som før.
