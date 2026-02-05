-- Migration: Add Czech i18n support for category names
-- Adds name_cs column and populates with Czech translations for EMDN categories

-- Step 1: Add name_cs column to emdn_categories
ALTER TABLE emdn_categories
ADD COLUMN IF NOT EXISTS name_cs TEXT;

COMMENT ON COLUMN emdn_categories.name_cs IS 'Czech translation of category name for i18n support';

-- Step 2: Populate name_cs with Czech translations
-- EMDN P09 (Orthopedic and prosthetic devices) categories
UPDATE emdn_categories SET name_cs = 'Ortopedické a protetické prostředky' WHERE code = 'P09';
UPDATE emdn_categories SET name_cs = 'Kostní implantáty' WHERE code = 'P0901';
UPDATE emdn_categories SET name_cs = 'Krční páteřní implantáty' WHERE code = 'P090101';
UPDATE emdn_categories SET name_cs = 'Hrudní páteřní implantáty' WHERE code = 'P090102';
UPDATE emdn_categories SET name_cs = 'Bederní páteřní implantáty' WHERE code = 'P090103';
UPDATE emdn_categories SET name_cs = 'Křížové páteřní implantáty' WHERE code = 'P090104';
UPDATE emdn_categories SET name_cs = 'Implantáty meziobratlových plotének' WHERE code = 'P090105';
UPDATE emdn_categories SET name_cs = 'Páteřní distrakční implantáty' WHERE code = 'P090106';
UPDATE emdn_categories SET name_cs = 'Páteřní spojovací tyče' WHERE code = 'P090107';
UPDATE emdn_categories SET name_cs = 'Páteřní háky a drátěné fixátory' WHERE code = 'P090108';
UPDATE emdn_categories SET name_cs = 'Páteřní destičky a šrouby' WHERE code = 'P090109';
UPDATE emdn_categories SET name_cs = 'Páteřní klece' WHERE code = 'P090110';
UPDATE emdn_categories SET name_cs = 'Implantáty obratlovýchčepů' WHERE code = 'P090111';
UPDATE emdn_categories SET name_cs = 'Totální náhrady kyčelního kloubu' WHERE code = 'P090201';
UPDATE emdn_categories SET name_cs = 'Acetabulární kloubní jamky' WHERE code = 'P090202';
UPDATE emdn_categories SET name_cs = 'Femorální dříky kyčle' WHERE code = 'P090203';
UPDATE emdn_categories SET name_cs = 'Femorální hlavice kyčle' WHERE code = 'P090204';
UPDATE emdn_categories SET name_cs = 'Bipolární femorální hlavice' WHERE code = 'P090205';
UPDATE emdn_categories SET name_cs = 'Vložky acetabulární jamky' WHERE code = 'P090206';
UPDATE emdn_categories SET name_cs = 'Bipolární acetabulární jamky' WHERE code = 'P090207';
UPDATE emdn_categories SET name_cs = 'Náhrady hlavice femuru' WHERE code = 'P090208';
UPDATE emdn_categories SET name_cs = 'Totální náhrady kolenního kloubu' WHERE code = 'P090301';
UPDATE emdn_categories SET name_cs = 'Femorální komponenty kolena' WHERE code = 'P090302';
UPDATE emdn_categories SET name_cs = 'Tibiální komponenty kolena' WHERE code = 'P090303';
UPDATE emdn_categories SET name_cs = 'Patellární komponenty' WHERE code = 'P090304';
UPDATE emdn_categories SET name_cs = 'Tibiální vložky' WHERE code = 'P090305';
UPDATE emdn_categories SET name_cs = 'Unicondylární náhrady kolena' WHERE code = 'P090306';
UPDATE emdn_categories SET name_cs = 'Náhrady loketního kloubu' WHERE code = 'P090401';
UPDATE emdn_categories SET name_cs = 'Humerální komponenty lokte' WHERE code = 'P090402';
UPDATE emdn_categories SET name_cs = 'Ulnární komponenty lokte' WHERE code = 'P090403';
UPDATE emdn_categories SET name_cs = 'Radiální komponenty lokte' WHERE code = 'P090404';
UPDATE emdn_categories SET name_cs = 'Náhrady ramenního kloubu' WHERE code = 'P090501';
UPDATE emdn_categories SET name_cs = 'Humerální komponenty ramene' WHERE code = 'P090502';
UPDATE emdn_categories SET name_cs = 'Glenoidní komponenty' WHERE code = 'P090503';
UPDATE emdn_categories SET name_cs = 'Reverzní komponenty ramene' WHERE code = 'P090504';
UPDATE emdn_categories SET name_cs = 'Náhrady hlezna' WHERE code = 'P090601';
UPDATE emdn_categories SET name_cs = 'Tibiální komponenty hlezna' WHERE code = 'P090602';
UPDATE emdn_categories SET name_cs = 'Talární komponenty' WHERE code = 'P090603';
UPDATE emdn_categories SET name_cs = 'Náhrady zápěstí' WHERE code = 'P090701';
UPDATE emdn_categories SET name_cs = 'Radiální komponenty zápěstí' WHERE code = 'P090702';
UPDATE emdn_categories SET name_cs = 'Karpální komponenty' WHERE code = 'P090703';
UPDATE emdn_categories SET name_cs = 'Náhrady prstů ruky' WHERE code = 'P090801';
UPDATE emdn_categories SET name_cs = 'Metakarpální komponenty' WHERE code = 'P090802';
UPDATE emdn_categories SET name_cs = 'Falangové komponenty' WHERE code = 'P090803';
UPDATE emdn_categories SET name_cs = 'Náhrady prstů nohy' WHERE code = 'P090901';
UPDATE emdn_categories SET name_cs = 'Metatarzální komponenty' WHERE code = 'P090902';
UPDATE emdn_categories SET name_cs = 'Falangové komponenty prstů nohy' WHERE code = 'P090903';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - desky' WHERE code = 'P0910';
UPDATE emdn_categories SET name_cs = 'Kompresní destičky' WHERE code = 'P091001';
UPDATE emdn_categories SET name_cs = 'Neutralizační destičky' WHERE code = 'P091002';
UPDATE emdn_categories SET name_cs = 'Opěrné destičky' WHERE code = 'P091003';
UPDATE emdn_categories SET name_cs = 'Můstkové destičky' WHERE code = 'P091004';
UPDATE emdn_categories SET name_cs = 'Úhlové destičky' WHERE code = 'P091005';
UPDATE emdn_categories SET name_cs = 'T-destičky' WHERE code = 'P091006';
UPDATE emdn_categories SET name_cs = 'L-destičky' WHERE code = 'P091007';
UPDATE emdn_categories SET name_cs = 'Kondylární destičky' WHERE code = 'P091008';
UPDATE emdn_categories SET name_cs = 'Rekonstrukční destičky' WHERE code = 'P091009';
UPDATE emdn_categories SET name_cs = 'Tubulární destičky' WHERE code = 'P091010';
UPDATE emdn_categories SET name_cs = 'Metafyzární destičky' WHERE code = 'P091011';
UPDATE emdn_categories SET name_cs = 'Klíčové destičky' WHERE code = 'P091012';
UPDATE emdn_categories SET name_cs = 'Pánvové destičky' WHERE code = 'P091013';
UPDATE emdn_categories SET name_cs = 'Kraniomaxilofaciální destičky' WHERE code = 'P091014';
UPDATE emdn_categories SET name_cs = 'Malé fragmentové destičky' WHERE code = 'P091015';
UPDATE emdn_categories SET name_cs = 'Mini fragmentové destičky' WHERE code = 'P091016';
UPDATE emdn_categories SET name_cs = 'Mikro fragmentové destičky' WHERE code = 'P091017';
UPDATE emdn_categories SET name_cs = 'Dětské destičky' WHERE code = 'P091018';
UPDATE emdn_categories SET name_cs = 'Blokovací destičky' WHERE code = 'P091019';
UPDATE emdn_categories SET name_cs = 'Volární destičky' WHERE code = 'P091020';
UPDATE emdn_categories SET name_cs = 'Dorzální destičky' WHERE code = 'P091021';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - šrouby' WHERE code = 'P0911';
UPDATE emdn_categories SET name_cs = 'Kortikální šrouby' WHERE code = 'P091101';
UPDATE emdn_categories SET name_cs = 'Spongiózní šrouby' WHERE code = 'P091102';
UPDATE emdn_categories SET name_cs = 'Kanylované šrouby' WHERE code = 'P091103';
UPDATE emdn_categories SET name_cs = 'Kompresní šrouby' WHERE code = 'P091104';
UPDATE emdn_categories SET name_cs = 'Blokovací šrouby' WHERE code = 'P091105';
UPDATE emdn_categories SET name_cs = 'Maléolární šrouby' WHERE code = 'P091106';
UPDATE emdn_categories SET name_cs = 'Hřebíkové šrouby' WHERE code = 'P091107';
UPDATE emdn_categories SET name_cs = 'Šrouby Herberta' WHERE code = 'P091108';
UPDATE emdn_categories SET name_cs = 'Kostní dlažby' WHERE code = 'P091109';
UPDATE emdn_categories SET name_cs = 'Interferenční šrouby' WHERE code = 'P091110';
UPDATE emdn_categories SET name_cs = 'Bioresorbovatelné šrouby' WHERE code = 'P091111';
UPDATE emdn_categories SET name_cs = 'Kraniální šrouby' WHERE code = 'P091112';
UPDATE emdn_categories SET name_cs = 'Dětské šrouby' WHERE code = 'P091113';
UPDATE emdn_categories SET name_cs = 'Mikro šrouby' WHERE code = 'P091114';
UPDATE emdn_categories SET name_cs = 'Mini šrouby' WHERE code = 'P091115';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - dřeňové hřeby' WHERE code = 'P0912';
UPDATE emdn_categories SET name_cs = 'Femorální dřeňové hřeby' WHERE code = 'P091201';
UPDATE emdn_categories SET name_cs = 'Tibiální dřeňové hřeby' WHERE code = 'P091202';
UPDATE emdn_categories SET name_cs = 'Humerální dřeňové hřeby' WHERE code = 'P091203';
UPDATE emdn_categories SET name_cs = 'Ulnární dřeňové hřeby' WHERE code = 'P091204';
UPDATE emdn_categories SET name_cs = 'Radiální dřeňové hřeby' WHERE code = 'P091205';
UPDATE emdn_categories SET name_cs = 'Zamykatelné dřeňové hřeby' WHERE code = 'P091206';
UPDATE emdn_categories SET name_cs = 'Nezamykatelné dřeňové hřeby' WHERE code = 'P091207';
UPDATE emdn_categories SET name_cs = 'Expandovatelné dřeňové hřeby' WHERE code = 'P091208';
UPDATE emdn_categories SET name_cs = 'Dětské dřeňové hřeby' WHERE code = 'P091209';
UPDATE emdn_categories SET name_cs = 'Retrográdní femorální hřeby' WHERE code = 'P091210';
UPDATE emdn_categories SET name_cs = 'Cephalomedullární hřeby' WHERE code = 'P091211';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - Kirschnerovy dráty' WHERE code = 'P0913';
UPDATE emdn_categories SET name_cs = 'Hladké K-dráty' WHERE code = 'P091301';
UPDATE emdn_categories SET name_cs = 'Závitové K-dráty' WHERE code = 'P091302';
UPDATE emdn_categories SET name_cs = 'Zatloukací K-dráty' WHERE code = 'P091303';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - dráty a kable' WHERE code = 'P0914';
UPDATE emdn_categories SET name_cs = 'Cerklážní dráty' WHERE code = 'P091401';
UPDATE emdn_categories SET name_cs = 'Sternální kabelové systémy' WHERE code = 'P091402';
UPDATE emdn_categories SET name_cs = 'Osteosyntéza - háky a skoby' WHERE code = 'P0915';
UPDATE emdn_categories SET name_cs = 'Háky pro napínání pásů' WHERE code = 'P091501';
UPDATE emdn_categories SET name_cs = 'Kostní skoby' WHERE code = 'P091502';
UPDATE emdn_categories SET name_cs = 'Pamětové skoby' WHERE code = 'P091503';
UPDATE emdn_categories SET name_cs = 'Externí fixátory' WHERE code = 'P0916';
UPDATE emdn_categories SET name_cs = 'Monolaterální fixátory' WHERE code = 'P091601';
UPDATE emdn_categories SET name_cs = 'Cirkulární fixátory' WHERE code = 'P091602';
UPDATE emdn_categories SET name_cs = 'Hybridní fixátory' WHERE code = 'P091603';
UPDATE emdn_categories SET name_cs = 'Šroubové piny pro fixátory' WHERE code = 'P091604';
UPDATE emdn_categories SET name_cs = 'Hladké piny pro fixátory' WHERE code = 'P091605';
UPDATE emdn_categories SET name_cs = 'Spojovací tyče fixátorů' WHERE code = 'P091606';
UPDATE emdn_categories SET name_cs = 'Svorky fixátorů' WHERE code = 'P091607';
UPDATE emdn_categories SET name_cs = 'Prstencové rámy fixátorů' WHERE code = 'P091608';
UPDATE emdn_categories SET name_cs = 'Kraniomaxilofaciální implantáty' WHERE code = 'P0917';
UPDATE emdn_categories SET name_cs = 'Kalvariální destičky' WHERE code = 'P091701';
UPDATE emdn_categories SET name_cs = 'Orbitální implantáty' WHERE code = 'P091702';
UPDATE emdn_categories SET name_cs = 'Zigomatické implantáty' WHERE code = 'P091703';
UPDATE emdn_categories SET name_cs = 'Mandibulární implantáty' WHERE code = 'P091704';
UPDATE emdn_categories SET name_cs = 'Maxilární implantáty' WHERE code = 'P091705';
UPDATE emdn_categories SET name_cs = 'Temporomandibulární implantáty' WHERE code = 'P091706';
UPDATE emdn_categories SET name_cs = 'Síťky pro kraniofaciální rekonstrukci' WHERE code = 'P091707';
UPDATE emdn_categories SET name_cs = 'Distrakční zařízení čelisti' WHERE code = 'P091708';
UPDATE emdn_categories SET name_cs = 'Biomateriály pro kostní náhradu' WHERE code = 'P0918';
UPDATE emdn_categories SET name_cs = 'Alogenní kostní štěpy' WHERE code = 'P091801';
UPDATE emdn_categories SET name_cs = 'Xenogenní kostní štěpy' WHERE code = 'P091802';
UPDATE emdn_categories SET name_cs = 'Syntetické kostní náhrady' WHERE code = 'P091803';
UPDATE emdn_categories SET name_cs = 'Kalcium fosfátové cementy' WHERE code = 'P091804';
UPDATE emdn_categories SET name_cs = 'Hydroxyapatitové granule' WHERE code = 'P091805';
UPDATE emdn_categories SET name_cs = 'Trikalciumfosfátové granule' WHERE code = 'P091806';
UPDATE emdn_categories SET name_cs = 'Kostní morfogenetické proteiny' WHERE code = 'P091807';
UPDATE emdn_categories SET name_cs = 'Kolagenové matricy' WHERE code = 'P091808';
UPDATE emdn_categories SET name_cs = 'Bioskla' WHERE code = 'P091809';
UPDATE emdn_categories SET name_cs = 'Kostní membrány a bariéry' WHERE code = 'P0919';
UPDATE emdn_categories SET name_cs = 'Resorbovatelné membrány' WHERE code = 'P091901';
UPDATE emdn_categories SET name_cs = 'Neresorbovatelné membrány' WHERE code = 'P091902';
UPDATE emdn_categories SET name_cs = 'Kolagenové membrány' WHERE code = 'P091903';
UPDATE emdn_categories SET name_cs = 'PTFE membrány' WHERE code = 'P091904';
UPDATE emdn_categories SET name_cs = 'Implantáty pro rekonstrukci měkkých tkání' WHERE code = 'P0920';
UPDATE emdn_categories SET name_cs = 'Šlachové štěpy' WHERE code = 'P092001';
UPDATE emdn_categories SET name_cs = 'Ligamentové štěpy' WHERE code = 'P092002';
UPDATE emdn_categories SET name_cs = 'Syntetické šlachové náhrady' WHERE code = 'P092003';
UPDATE emdn_categories SET name_cs = 'Šlachové kotvy' WHERE code = 'P092004';
UPDATE emdn_categories SET name_cs = 'Interferenční šrouby pro ACL' WHERE code = 'P092005';
UPDATE emdn_categories SET name_cs = 'Endobutton systémy' WHERE code = 'P092006';
UPDATE emdn_categories SET name_cs = 'Kloubní náhrady prstů' WHERE code = 'P0921';
UPDATE emdn_categories SET name_cs = 'Silikonové implantáty prstů' WHERE code = 'P092101';
UPDATE emdn_categories SET name_cs = 'Pyrocarbonové implantáty prstů' WHERE code = 'P092102';
UPDATE emdn_categories SET name_cs = 'Meniskální implantáty' WHERE code = 'P0922';
UPDATE emdn_categories SET name_cs = 'Alogenní meniskální štěpy' WHERE code = 'P092201';
UPDATE emdn_categories SET name_cs = 'Syntetické meniskální náhrady' WHERE code = 'P092202';
UPDATE emdn_categories SET name_cs = 'Kolagenové meniskální implantáty' WHERE code = 'P092203';
UPDATE emdn_categories SET name_cs = 'Chrupavkové regenerační systémy' WHERE code = 'P0923';
UPDATE emdn_categories SET name_cs = 'Autologní chondrocyty' WHERE code = 'P092301';
UPDATE emdn_categories SET name_cs = 'Matricy pro chondrocyty' WHERE code = 'P092302';
UPDATE emdn_categories SET name_cs = 'Osteochondrální štěpy' WHERE code = 'P092303';
UPDATE emdn_categories SET name_cs = 'Mikrofrakturační nástroje' WHERE code = 'P092304';
UPDATE emdn_categories SET name_cs = 'Pánevní rekonstrukční implantáty' WHERE code = 'P0924';
UPDATE emdn_categories SET name_cs = 'Acetabulární posílovací prstence' WHERE code = 'P092401';
UPDATE emdn_categories SET name_cs = 'Pánevní rekonstrukční destičky' WHERE code = 'P092402';
UPDATE emdn_categories SET name_cs = 'Pánevní klíny a bloky' WHERE code = 'P092403';
UPDATE emdn_categories SET name_cs = 'Triflangové acetabulární komponenty' WHERE code = 'P092404';
UPDATE emdn_categories SET name_cs = 'Nádorové implantáty' WHERE code = 'P0925';
UPDATE emdn_categories SET name_cs = 'Megaprosthesis femorální' WHERE code = 'P092501';
UPDATE emdn_categories SET name_cs = 'Megaprosthesis tibiální' WHERE code = 'P092502';
UPDATE emdn_categories SET name_cs = 'Megaprosthesis humerální' WHERE code = 'P092503';
UPDATE emdn_categories SET name_cs = 'Modulární nádorové systémy' WHERE code = 'P092504';
UPDATE emdn_categories SET name_cs = 'Pánevní nádorové rekonstrukce' WHERE code = 'P092505';
UPDATE emdn_categories SET name_cs = 'Revizní implantáty' WHERE code = 'P0926';
UPDATE emdn_categories SET name_cs = 'Revizní dříky kyčle' WHERE code = 'P092601';
UPDATE emdn_categories SET name_cs = 'Revizní acetabulární komponenty' WHERE code = 'P092602';
UPDATE emdn_categories SET name_cs = 'Revizní kolenní implantáty' WHERE code = 'P092603';
UPDATE emdn_categories SET name_cs = 'Distální femorální náhrady' WHERE code = 'P092604';
UPDATE emdn_categories SET name_cs = 'Proximální tibiální náhrady' WHERE code = 'P092605';
UPDATE emdn_categories SET name_cs = 'Augmentační klíny a bloky' WHERE code = 'P092606';
UPDATE emdn_categories SET name_cs = 'Revizní systémy ramen' WHERE code = 'P092607';
UPDATE emdn_categories SET name_cs = 'Sportovní medicína - implantáty' WHERE code = 'P0927';
UPDATE emdn_categories SET name_cs = 'Ramenní kotvy' WHERE code = 'P092701';
UPDATE emdn_categories SET name_cs = 'Labrální kotvy' WHERE code = 'P092702';
UPDATE emdn_categories SET name_cs = 'Rotatorkuffové kotvy' WHERE code = 'P092703';
UPDATE emdn_categories SET name_cs = 'Biceptové tenodesní implantáty' WHERE code = 'P092704';
UPDATE emdn_categories SET name_cs = 'Acromioclaviculární implantáty' WHERE code = 'P092705';
UPDATE emdn_categories SET name_cs = 'Patellofemoralní implantáty' WHERE code = 'P0928';
UPDATE emdn_categories SET name_cs = 'Patelární protézy' WHERE code = 'P092801';
UPDATE emdn_categories SET name_cs = 'Trochleární protézy' WHERE code = 'P092802';
UPDATE emdn_categories SET name_cs = 'Patelární úponové implantáty' WHERE code = 'P092803';
UPDATE emdn_categories SET name_cs = 'Pediatrické ortopedické implantáty' WHERE code = 'P0929';
UPDATE emdn_categories SET name_cs = 'Pediatrické dřeňové hřeby' WHERE code = 'P092901';
UPDATE emdn_categories SET name_cs = 'Pediatrické destičky' WHERE code = 'P092902';
UPDATE emdn_categories SET name_cs = 'Pediatrické páteřní implantáty' WHERE code = 'P092903';
UPDATE emdn_categories SET name_cs = 'Růstové modulační implantáty' WHERE code = 'P092904';
UPDATE emdn_categories SET name_cs = 'Epifyziolázové skoby' WHERE code = 'P092905';
UPDATE emdn_categories SET name_cs = 'Ortopedické implantáty - ostatní' WHERE code = 'P0930';
UPDATE emdn_categories SET name_cs = 'Kostní pinzetové systémy' WHERE code = 'P093001';
UPDATE emdn_categories SET name_cs = 'Intramedulární distrakční hřeby' WHERE code = 'P093002';
UPDATE emdn_categories SET name_cs = 'Magnetické implantáty pro růst' WHERE code = 'P093003';
UPDATE emdn_categories SET name_cs = 'Absorpční šrouby' WHERE code = 'P093004';
UPDATE emdn_categories SET name_cs = 'Polymorfní desky' WHERE code = 'P093005';

-- EMDN P10 (Prosthetic devices) categories
UPDATE emdn_categories SET name_cs = 'Protetické prostředky' WHERE code = 'P10';
UPDATE emdn_categories SET name_cs = 'Horní končetinové protézy' WHERE code = 'P1001';
UPDATE emdn_categories SET name_cs = 'Ramenní protézy' WHERE code = 'P100101';
UPDATE emdn_categories SET name_cs = 'Paže protézy nad loktem' WHERE code = 'P100102';
UPDATE emdn_categories SET name_cs = 'Protézy předloktí' WHERE code = 'P100103';
UPDATE emdn_categories SET name_cs = 'Protézy zápěstí' WHERE code = 'P100104';
UPDATE emdn_categories SET name_cs = 'Protézy ruky' WHERE code = 'P100105';
UPDATE emdn_categories SET name_cs = 'Protézy prstů ruky' WHERE code = 'P100106';
UPDATE emdn_categories SET name_cs = 'Dolní končetinové protézy' WHERE code = 'P1002';
UPDATE emdn_categories SET name_cs = 'Protézy kyčle' WHERE code = 'P100201';
UPDATE emdn_categories SET name_cs = 'Protézy stehna' WHERE code = 'P100202';
UPDATE emdn_categories SET name_cs = 'Protézy kolena' WHERE code = 'P100203';
UPDATE emdn_categories SET name_cs = 'Protézy bérce' WHERE code = 'P100204';
UPDATE emdn_categories SET name_cs = 'Protézy hlezna a chodidla' WHERE code = 'P100205';
UPDATE emdn_categories SET name_cs = 'Protézy chodidla' WHERE code = 'P100206';
UPDATE emdn_categories SET name_cs = 'Protézy prstů nohy' WHERE code = 'P100207';
UPDATE emdn_categories SET name_cs = 'Myoelektrické protézy' WHERE code = 'P1003';
UPDATE emdn_categories SET name_cs = 'Myoelektrické ruce' WHERE code = 'P100301';
UPDATE emdn_categories SET name_cs = 'Myoelektrické zápěstí' WHERE code = 'P100302';
UPDATE emdn_categories SET name_cs = 'Myoelektrické lokty' WHERE code = 'P100303';
UPDATE emdn_categories SET name_cs = 'Protetické zásuvky a linery' WHERE code = 'P1004';
UPDATE emdn_categories SET name_cs = 'Silikonové linery' WHERE code = 'P100401';
UPDATE emdn_categories SET name_cs = 'Gelové linery' WHERE code = 'P100402';
UPDATE emdn_categories SET name_cs = 'Vakuové zásuvky' WHERE code = 'P100403';
UPDATE emdn_categories SET name_cs = 'Silikónové čepy' WHERE code = 'P100404';

-- Handle any remaining categories without translations (keep English name)
UPDATE emdn_categories
SET name_cs = name
WHERE name_cs IS NULL;

-- Step 3: Drop and recreate materialized view to include name_cs
DROP MATERIALIZED VIEW IF EXISTS category_product_counts CASCADE;

CREATE MATERIALIZED VIEW category_product_counts AS
WITH RECURSIVE category_tree AS (
  -- Base: direct product counts per category
  SELECT
    c.id,
    c.code,
    c.name,
    c.name_cs,
    c.parent_id,
    c.path,
    c.depth,
    COUNT(p.id) as direct_count
  FROM emdn_categories c
  LEFT JOIN products p ON p.emdn_category_id = c.id
  GROUP BY c.id, c.code, c.name, c.name_cs, c.parent_id, c.path, c.depth
)
SELECT
  ct.id,
  ct.code,
  ct.name,
  ct.name_cs,
  ct.parent_id,
  ct.path,
  ct.depth,
  ct.direct_count,
  -- Total count includes all descendants (using path prefix matching)
  (
    SELECT COALESCE(SUM(sub.direct_count), 0)
    FROM category_tree sub
    WHERE sub.id = ct.id OR sub.path LIKE ct.path || '.%'
  )::INTEGER as total_count
FROM category_tree ct
ORDER BY ct.code;

-- Recreate unique index for concurrent refresh
CREATE UNIQUE INDEX idx_category_counts_id
  ON category_product_counts(id);

-- Recreate index for fast parent lookups (tree building)
CREATE INDEX idx_category_counts_parent
  ON category_product_counts(parent_id);

-- Recreate index for path-based queries
CREATE INDEX idx_category_counts_path
  ON category_product_counts(path text_pattern_ops);

-- Grant permissions
GRANT SELECT ON category_product_counts TO anon, authenticated;

COMMENT ON MATERIALIZED VIEW category_product_counts IS
  'Precomputed category product counts with Czech i18n support.
   Refresh with: SELECT refresh_category_counts()';

COMMENT ON COLUMN category_product_counts.name_cs IS 'Czech translation for category name';

-- Initial refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts;
