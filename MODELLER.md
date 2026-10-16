# 3D-modeller til Tidsmaskinen · Rejse 1: Jelling, ca. år 968

Bestillingsliste til Claude Design. Modellerne erstatter de pladsholdere, der i dag er bygget i kode.
Oplevelsen kører i Meta Quest 3 (browser), så hver model skal være let.

## Fælles regler for alle modeller

**Stil**
- Low poly med cel-shading: flade farveflader, synlige facetter, klare silhuetter. Tænk "Firewatch møder Studio Ghibli", ikke fotorealisme.
- Farver ligger som vertex-farver eller som én lille palet-tekstur (højst 256 × 256 px). Ingen normal-, roughness- eller metal-maps, og ingen gennemsigtighed, medmindre det står ved modellen.
- Én model = ét mesh og ét materiale. Det holder antallet af tegneopkald (draw calls) nede, og det er det vigtigste for ydelsen.

**Teknik**
- Format: GLB (glTF 2.0).
- Enheder: meter i virkelig størrelse. Y er op, og forsiden vender mod +Z.
- Nulpunkt: midt på jorden under modellen (ved figurer: mellem fødderne).
- Trekantbudget: står ved hver model. Hele scenen ved ét stop må højst have ca. 150.000 trekanter.

**Figurer (mennesker): ja, T-pose**
- Byg dem i **T-pose** (armene vandret ud til siden, håndfladerne nedad) med et **humanoid skelet**.
- Brug knoglenavne som Mixamo (Hips, Spine, Spine1, Spine2, Neck, Head, LeftShoulder, LeftArm, LeftForeArm, LeftHand, RightUpLeg, RightLeg, RightFoot osv.). Så kan figurerne også animeres via Mixamo senere.
- Hele figuren skal være **ét samlet "skinned" mesh** med ét materiale: krop, tøj, hår og skæg i ét. Ingen ansigts-rig. Øjne, bryn og mund kan være modelleret eller malet.
- Værktøj og våben laves som **separate små modeller**, der hænges på hånd-knoglen i koden.
- Budget: 2.500-3.500 trekanter pr. figur (kong Harald højst 4.500).
- Animationer, vi får brug for senere: idle, gå, bære noget foran sig, hugge med økse, hamre/mejsle, pege, vende hovedet, løbe (børn).

**Dyr**
- Neutral stående stilling med et simpelt firbenet skelet: rod, ryg, hals, hoved, kæbe, hale og fire ben i to led.
- Ét mesh, ét materiale.

**Historiske rettesnore**
- Ingen horn på hjelmene, og intet "fantasy-vikinge"-look.
- Plantefarvet tøj: krap-rød, vajd-blå, gul fra vau, brune og grå nuancer samt ufarvet uld og hør.
- Kvinder: hængeselekjole (smokkr) over en lang særk, to ovale skålformede spænder med en perlekæde imellem, ofte tørklæde.
- Mænd: knælang kjortel med bælte, bukser og benviklinger, læderko.

---

## A. Tidskapslen

Bestilles ikke. Kapslen bygges i koden, så den passer til skærme, knapper og lys.

## B. Landsbyen

| # | Model | Beskrivelse | Trekanter |
|---|---|---|---|
| B1 | Langhus, stort | 22 × 7 m med buede langvægge (bredest på midten), lodrette planker og skrå støttestolper udvendigt. Tag af strå eller græstørv med buet tagryg (højest på midten, ca. 5 m). Valmede ender, en dør på hver langside, røghul i taget og krydsede gavlbrædder. | 3.000 |
| B2 | Langhus, lille | Samme stil, 18 × 6,4 m. Gerne en lidt anden tagtype (træspån). | 2.500 |
| B3 | Grubehus | Lille værkstedshus, 4 × 3 m, nedgravet gulv, lave vægge og stejlt stråtag. | 800 |
| B4 | Opstadsvæv | Skrå trævæv (ca. 2 m høj) med rødt vævet stof, kædetråde og en række vævevægte af ler forneden. | 800 |
| B5 | Brændestabel med huggeblok | Stablede kløvede kævler og en huggeblok. | 600 |
| B6 | Ildsted | Ring af sten, trefod af grene og en jerngryde i kæde. Flammerne laves separat (2-3 enkle kegler, gul/orange, uden lys). | 600 |
| B7 | Tønde | Trætønde med jernbånd, 0,7 m. | 200 |
| B8 | Brønd | Stenkrans, to stolper, tværbjælke og træspand. | 600 |
| B9 | Fisketørrestativ | Stativ af grene med 8-10 hængende fisk. | 500 |
| B10 | Bænk | Simpel træbænk. | 100 |
| B11 | Flettet hegn | Modul på 2 m flettet gærde (pil/hassel) mellem stolper. Bruges mange gange. | 150 |
| B12 | Får | Lille gammel nordisk fåreart med uldkrop, mørkt hoved og ben, korte horn valgfrit. | 600 |
| B13 | Kvinde ved væven | Voksen kvinde i blå smokkr over lys særk, okkerfarvet forklæde, to ovale bronzespænder med perlekæde, lyst tørklæde og lang fletning. | 3.000 |
| B14 | Mand med økse | Voksen mand i rødbrun kjortel, mørke bukser, benviklinger, kort skæg. | 3.000 |
| B15 | Dreng | Ca. 8 år. Grøn kjortel og bare ben eller benviklinger. | 2.000 |
| B16 | Pige | Ca. 8 år. Brun-orange kjole og lang lys fletning. | 2.000 |

## C. Gravhøjene og palisaden

Selve højene og terrænet laves i koden og bestilles ikke.

| # | Model | Beskrivelse | Trekanter |
|---|---|---|---|
| C1 | Palisademodul | 4 m langt stykke palisade af kløvede egestammer (ca. 4 m høje, spidse toppe) med en vandret bindebjælke bag. Bruges mange gange. | 400 |
| C2 | Palisadeport | Portåbning på 14 m med to kraftige portstolper og en overligger. | 600 |
| C3 | Skibssætningssten | Fire varianter af stående, grå granitsten, 1-2,5 m høje, let tilhuggede. | 100 pr. stk. |
| C4 | Græstørv | Udskåret tørv, 50 × 38 × 15 cm, græs ovenpå og jord forneden. | 50 |
| C5 | Stak af græstørv | Ca. 30 tørv stablet i rækker. | 600 |
| C6 | Oksekærre | Tohjulet trækærre læsset med tørv. | 800 |
| C7 | Okse | Stor, rolig trækokse med seletøj (kan stå foran kærren). | 1.200 |
| C8 | Tørvebærere (×4) | Fire varianter af arbejdsmænd i jordfarvede kjortler med forskellige hår- og skægfarver. | 2.500 pr. stk. |

## D. Jellingstenen og kirken

| # | Model | Beskrivelse | Trekanter |
|---|---|---|---|
| D1 | Haralds runesten | Tresidet granitsten, 2,43 m høj, let skrå. Side A: vandrette runelinjer i felter. Side B: det store dyr omslynget af en slange. Side C: Kristus med udstrakte arme omgivet af ranker. Bemalet, som man har rekonstrueret det: røde, blå og sorte farver på grå sten. Relieffet kan være malet på en palet-tekstur (her må teksturen være op til 1024 px). | 3.000 |
| D2 | Gorms lille sten | Lavere (ca. 1,4 m), smallere og grå med én enkel runelinje. | 400 |
| D3 | Trækirke | Lille stavkirke, skib ca. 10 × 6 m med smallere kor. Tjæret mørkt træ, stejlt spåntag, dragehoveder på gavlspidserne og forgyldt kors. | 3.000 |
| D4 | Kong Harald Blåtand | Ca. 40-50 år. Lang vajd-blå kappe holdt med en guldnål på højre skulder, krap-rød kjortel med broderet kant, mørke bukser, rødblondt skæg og hår, smal guldring om hovedet og armring af guld. Værdig holdning. | 4.500 |
| D5 | Stenhugger | Arbejdsmand i gråbrun kjortel, læderforklæde og lille hue med skæg. Hammer og mejsel som separate modeller. | 3.000 |
| D6 | Præsten Poppo | Ældre mand i lang mørk kåbe, gråt hår med tonsur og et trækors på en stav. | 3.000 |
| D7 | Vagter (×2) | Krigere i grønbrune kjortler, spangenhjelm eller ingen hjelm, rundt skjold på ryggen (bemalet i felter) og spyd. To varianter. | 3.000 pr. stk. |
| D8 | Hund | Mellemstor brun gårdhund fra vikingetiden med spidse ører og krøllet hale. Hunden er en hovedperson (den opdager kapslen), så hovedet må gerne være udtryksfuldt. | 1.000 |

## E. Natur

| # | Model | Beskrivelse | Trekanter |
|---|---|---|---|
| E1 | Eg (3 varianter) | Bred krone af klumpede facetter og kraftig stamme. | 150-300 |
| E2 | Birk (2 varianter) | Hvid stamme med sorte mærker og let, lysegrøn krone. | 150-250 |
| E3 | Fjerntræ | Meget simpelt træ til horisonten (en kegle eller kugle på en stamme). | 30 |
| E4 | Busk (2 varianter) | | 100 |
| E5 | Sten (3 varianter) | Til at strø ud i landskabet. | 40 |
| E6 | Sivklump | Til søbredden. | 100 |
| E7 | Krage | Flyvende, med vinger som separate knogler eller objekter til vingeslag. | 150 |
| E8 | Sommerfugl | To vinger (gul, blå eller hvid). Et lille nik til Bradbury. | 20 |

## F. Værktøj og våben (hænges på hånd-knoglen)

Økse, hammer, mejsel, spyd, rundt skjold, korsstav, tenvægt med ten, træspand. 50-300 trekanter hver. Nulpunktet skal ligge der, hvor hånden holder om skaftet, og skaftet skal pege langs +Z.

---

**Prioritet**, hvis I vil tage det i bidder:
1. D4 Harald, D8 hund, D1 runestenen og D5 stenhuggeren (det stop, man er tættest på)
2. Landsbyen (B)
3. Gravhøjene (C) og naturen (E)
