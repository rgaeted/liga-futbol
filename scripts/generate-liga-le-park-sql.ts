import { writeFileSync } from 'node:fs'

const ORG_ID = 'org_liga_le_park'
const SLUG = 'liga-le-park'
const ORG = 'Liga Le Park'
const CAT_ID = 'fcat_llp_plus35'
const CAT = '+35'
const P = 'llp'

const TEAMS: Array<[string, string]> = [
  ['bufalos', 'Bufalos'],
  ['manque', 'Manque FC'],
  ['picana', 'Picana'],
  ['huevo', 'Huevo FC'],
  ['remalinhos', 'Remalinhos'],
  ['urnav', 'Urnav FC'],
  ['guadalina', 'Guadalina'],
  ['cabo-suelto', 'Cabo Suelto'],
  ['tocayo', 'Tocayo'],
  ['chicha-amigo', 'Chicha Amigo'],
]

const POS = [
  'Arquero', 'Defensa central', 'Defensa central', 'Lateral derecho', 'Lateral izquierdo',
  'Mediocampista', 'Mediocampista', 'Mediocampista', 'Volante', 'Extremo derecho',
  'Extremo izquierdo', 'Delantero', 'Delantero', 'Defensa', 'Mediocampista',
]

const FN = [
  'Matías', 'Diego', 'Tomás', 'Nico', 'Lucas', 'Felipe', 'Andrés', 'Sebastián',
  'Cristóbal', 'Ignacio', 'Rodrigo', 'Pablo', 'Camilo', 'Benjamín', 'Martín',
  'Javier', 'Gonzalo', 'Francisco', 'Alejandro', 'Maximiliano', 'Eduardo',
  'Hernán', 'Patricio', 'Claudio', 'Marcelo', 'Ricardo', 'Daniel', 'Carlos',
  'Jorge', 'Mauricio', 'Fernando', 'Sergio', 'Víctor', 'Roberto', 'Alonso',
  'Bruno', 'Emilio', 'Gabriel', 'Hugo', 'Iván', 'Jaime', 'Leonardo', 'Manuel',
  'Oscar', 'Pedro', 'Raúl', 'Simón', 'Vicente', 'Xavier', 'Yago',
]

const LN = [
  'Rojas', 'Fuentes', 'Silva', 'Vega', 'Morales', 'Castro', 'Muñoz', 'Pérez',
  'González', 'López', 'Martínez', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Rivera', 'Gómez', 'Díaz', 'Herrera', 'Vargas', 'Romero', 'Soto', 'Contreras',
  'Sepúlveda', 'Miranda', 'Figueroa', 'Espinoza', 'Valenzuela', 'Tapia', 'Navarro',
  'Araya', 'Campos', 'Jara', 'Reyes', 'Bravo', 'Carrasco', 'Ortiz', 'Núñez',
  'Medina', 'Aguilera', 'Poblete', 'Salazar', 'Cortés', 'Molina', 'Vidal',
  'Henríquez', 'Bustos', 'Parra', 'Zúñiga', 'Donoso',
]

const esc = (s: string) => s.replace(/'/g, "''")

let sql = 'BEGIN;\n'

sql += `INSERT INTO "Organization" ("id","slug","name","primaryColor","secondaryColor","status","updatedAt")
VALUES ('${ORG_ID}','${SLUG}','${ORG}','#2D5016','#F5E6C8','ACTIVE',NOW())
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","status"='ACTIVE',"updatedAt"=NOW();\n`

sql += `INSERT INTO "FriendlyCategory" ("id","organizationId","name","description","isActive","updatedAt")
SELECT '${CAT_ID}', o."id", '${CAT}', 'Categoría +35 años', true, NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","isActive"=true,"updatedAt"=NOW();\n`

for (let ti = 0; ti < TEAMS.length; ti++) {
  const [slug, name] = TEAMS[ti]!
  const tid = `${P}-team-${slug}`
  sql += `INSERT INTO "Team" ("id","organizationId","name","color","updatedAt")
SELECT '${tid}', o."id", '${esc(name)}', '#2D5016', NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","organizationId"=EXCLUDED."organizationId","updatedAt"=NOW();\n`

  for (let n = 1; n <= 15; n++) {
    const suf = String(n).padStart(2, '0')
    const pid = `${P}-person-${slug}-${suf}`
    const plid = `${P}-player-${slug}-${suf}`
    const idx = ti * 15 + (n - 1)
    const fn = FN[idx % FN.length]!
    const ln = LN[(idx * 3 + ti) % LN.length]!
    const pos = POS[(n - 1) % POS.length]!

    sql += `INSERT INTO "Person" ("id","firstName","lastName","updatedAt")
VALUES ('${pid}','${esc(fn)}','${esc(ln)}',NOW())
ON CONFLICT ("id") DO UPDATE SET "firstName"=EXCLUDED."firstName","lastName"=EXCLUDED."lastName","updatedAt"=NOW();\n`

    sql += `INSERT INTO "Player" ("id","organizationId","personId","teamId","jerseyNumber","position","primaryPosition","updatedAt")
SELECT '${plid}', o."id", '${pid}', '${tid}', ${n}, '${esc(pos)}', '${esc(pos)}', NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("personId","organizationId") DO UPDATE SET "teamId"='${tid}',"jerseyNumber"=${n},"position"=EXCLUDED."position","primaryPosition"=EXCLUDED."primaryPosition","updatedAt"=NOW();\n`

    sql += `INSERT INTO "PlayerCategory" ("playerId","friendlyCategoryId","createdAt")
SELECT p."id", '${CAT_ID}', NOW() FROM "Player" p WHERE p."id"='${plid}'
ON CONFLICT ("playerId","friendlyCategoryId") DO NOTHING;\n`
  }
}

for (const [memId, email] of [['mem_llp_ricardo', 'ricardo.gaete@gmail.com']] as const) {
  sql += `INSERT INTO "OrganizationMembership" ("id","organizationId","userId","role","updatedAt")
SELECT '${memId}', o."id", u."id", 'ORG_ADMIN', NOW()
FROM "Organization" o JOIN "User" u ON u."email"='${email}'
WHERE o."slug"='${SLUG}'
ON CONFLICT ("organizationId","userId") DO UPDATE SET "role"='ORG_ADMIN',"updatedAt"=NOW();\n`
}

sql += 'COMMIT;\n'

writeFileSync('supabase/.temp/seed-liga-le-park.sql', sql)
console.log(`Generated ${sql.split('\n').length} lines`)
