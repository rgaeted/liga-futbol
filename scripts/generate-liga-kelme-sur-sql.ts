import { writeFileSync } from 'node:fs'
import bcrypt from 'bcryptjs'

const ORG_ID = 'org_liga_kelme_sur'
const SLUG = 'liga-kelme-sur'
const ORG = 'Liga Kelme Sur'
const P = 'lks'
const ADMIN_EMAIL = 'felipe@ligalab.cl'
const ADMIN_NAME = 'Felipe LigaLab'
const ADMIN_USER_ID = 'user_felipe_ligalab'
const ADMIN_MEM_ID = 'mem_lks_felipe'
const PASSWORD_HASH = bcrypt.hashSync('password123', 10)

const CATEGORIES: Array<[string, string, string]> = [
  ['fcat_lks_senior', 'Senior', 'Categoría Senior'],
  ['fcat_lks_plus35', '+35', 'Categoría +35 años'],
  ['fcat_lks_plus45', '+45', 'Categoría +45 años'],
  ['fcat_lks_intermedia', 'Intermedia', 'Categoría Intermedia'],
]

const TEAMS: Array<[string, string, string]> = [
  ['linares', 'Deportes Linares', 'fcat_lks_senior'],
  ['union-sur', 'Unión Sur', 'fcat_lks_senior'],
  ['cobre-sur', 'Cobre Sur FC', 'fcat_lks_plus35'],
  ['rio-bueno', 'Río Bueno', 'fcat_lks_plus35'],
  ['notros', 'Los Notros', 'fcat_lks_plus45'],
  ['villa-alegre', 'Villa Alegre', 'fcat_lks_plus45'],
  ['punta-fc', 'Punta FC', 'fcat_lks_intermedia'],
  ['austral', 'Austral FC', 'fcat_lks_intermedia'],
]

const POS = [
  'Arquero', 'Defensa central', 'Defensa central', 'Lateral derecho', 'Lateral izquierdo',
  'Mediocampista', 'Mediocampista', 'Mediocampista', 'Volante', 'Extremo derecho',
  'Extremo izquierdo', 'Delantero', 'Delantero', 'Defensa', 'Mediocampista',
]

const FN = [
  'Arturo', 'Bastián', 'César', 'Damián', 'Esteban', 'Fabian', 'Germán', 'Héctor',
  'Ismael', 'Joaquín', 'Kevin', 'Lautaro', 'Marcos', 'Nelson', 'Orlando', 'Patricio',
  'Quentin', 'Renato', 'Samuel', 'Tobías', 'Ulises', 'Valentín', 'Walter', 'Yerko',
  'Adrián', 'Boris', 'Cristián', 'Domingo', 'Elías', 'Fabián', 'Guillermo', 'Hugo',
  'Iván', 'Jorge', 'Karl', 'Luis', 'Mario', 'Néstor', 'Omar', 'Pascual',
  'Ramiro', 'Salvador', 'Tomás', 'Ubaldo', 'Víctor', 'Wilson', 'Ximén', 'Yonathan',
  'Alfredo', 'Bernardo', 'Ciro', 'Dario', 'Enrique', 'Felipe', 'Gustavo', 'Horacio',
  'Ignacio', 'Julio', 'Klaus', 'Leandro', 'Miguel', 'Norberto', 'Osvaldo', 'Pablo',
  'Rafael', 'Santiago', 'Teodoro', 'Uriel', 'Vicente', 'William', 'Yahir', 'Zacarías',
  'Amaro', 'Benito', 'Camilo', 'Dante', 'Efraín', 'Flavio', 'Gonzalo', 'Hernán',
  'Iker', 'Jacinto', 'Kaleb', 'Lorenzo', 'Mateo', 'Nicolás', 'Octavio', 'Pedro',
  'Quique', 'Rubén', 'Sergio', 'Tadeo', 'Ulrich', 'Vladimir', 'Williams', 'Yago',
  'Álvaro', 'Bruno', 'Claudio', 'Diego', 'Emilio', 'Francisco', 'Gabriel', 'Humberto',
  'Javier', 'Leonardo', 'Manuel', 'Nicolás', 'Oscar', 'Rodrigo', 'Sebastián', 'Tito',
]

const LN = [
  'Ahumada', 'Becerra', 'Cáceres', 'Duarte', 'Escobar', 'Farias', 'Gallardo', 'Huerta',
  'Ibáñez', 'Jofré', 'Klein', 'Lara', 'Maldonado', 'Nieto', 'Orellana', 'Palma',
  'Quezada', 'Riquelme', 'Sandoval', 'Trujillo', 'Urrutia', 'Villagrán', 'Wolf', 'Yáñez',
  'Zamorano', 'Acuña', 'Bustamante', 'Cornejo', 'Delgado', 'Estay', 'Fuentes', 'Godoy',
  'Hidalgo', 'Inostroza', 'Jara', 'Kruger', 'Lagos', 'Méndez', 'Navarrete', 'Olivares',
  'Pizarro', 'Quinteros', 'Rivas', 'Salinas', 'Tapia', 'Ulloa', 'Vera', 'Wenzel',
  'Xavier', 'Yávar', 'Zavala', 'Aravena', 'Baeza', 'Cisternas', 'Duran', 'Elgueta',
  'Farías', 'Gutiérrez', 'Hurtado', 'Iturra', 'Jiménez', 'Kast', 'Leiva', 'Mora',
  'Núñez', 'Ocampo', 'Paredes', 'Quiroga', 'Rojas', 'Silva', 'Toro', 'Uribe',
  'Valdés', 'Ward', 'Yáñez', 'Zúñiga', 'Alarcón', 'Bustos', 'Carrasco', 'Díaz',
  'Espinoza', 'Flores', 'González', 'Henríquez', 'Ibarra', 'Jara', 'Keller', 'López',
  'Martínez', 'Naranjo', 'Ortiz', 'Pérez', 'Ramírez', 'Soto', 'Torres', 'Vargas',
  'Aguilera', 'Bravo', 'Castro', 'Contreras', 'Donoso', 'Espinoza', 'Figueroa', 'Gómez',
  'Herrera', 'Inzunza', 'Jara', 'Kastillo', 'Luna', 'Molina', 'Navarro', 'Oyarzún',
]

const esc = (s: string) => s.replace(/'/g, "''")

let sql = 'BEGIN;\n'

sql += `INSERT INTO "Organization" ("id","slug","name","primaryColor","secondaryColor","status","updatedAt")
VALUES ('${ORG_ID}','${SLUG}','${ORG}','#CD212A','#1B2838','ACTIVE',NOW())
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","status"='ACTIVE',"primaryColor"=EXCLUDED."primaryColor","secondaryColor"=EXCLUDED."secondaryColor","updatedAt"=NOW();\n`

for (const [catId, catName, catDesc] of CATEGORIES) {
  sql += `INSERT INTO "FriendlyCategory" ("id","organizationId","name","description","isActive","updatedAt")
SELECT '${catId}', o."id", '${esc(catName)}', '${esc(catDesc)}', true, NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","description"=EXCLUDED."description","isActive"=true,"organizationId"=EXCLUDED."organizationId","updatedAt"=NOW();\n`
}

for (let ti = 0; ti < TEAMS.length; ti++) {
  const [slug, name, catId] = TEAMS[ti]!
  const tid = `${P}-team-${slug}`
  sql += `INSERT INTO "Team" ("id","organizationId","name","color","updatedAt")
SELECT '${tid}', o."id", '${esc(name)}', '#CD212A', NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","organizationId"=EXCLUDED."organizationId","updatedAt"=NOW();\n`

  for (let n = 1; n <= 15; n++) {
    const suf = String(n).padStart(2, '0')
    const pid = `${P}-person-${slug}-${suf}`
    const plid = `${P}-player-${slug}-${suf}`
    const idx = ti * 15 + (n - 1)
    const fn = FN[idx % FN.length]!
    const ln = LN[(idx * 5 + ti * 2) % LN.length]!
    const pos = POS[(n - 1) % POS.length]!

    sql += `INSERT INTO "Person" ("id","firstName","lastName","updatedAt")
VALUES ('${pid}','${esc(fn)}','${esc(ln)}',NOW())
ON CONFLICT ("id") DO UPDATE SET "firstName"=EXCLUDED."firstName","lastName"=EXCLUDED."lastName","updatedAt"=NOW();\n`

    sql += `INSERT INTO "Player" ("id","personId","organizationId","teamId","jerseyNumber","position","primaryPosition","updatedAt")
SELECT '${plid}', '${pid}', o."id", '${tid}', ${n}, '${esc(pos)}', '${esc(pos)}', NOW()
FROM "Organization" o WHERE o."slug"='${SLUG}'
ON CONFLICT ("personId","organizationId") DO UPDATE SET "teamId"='${tid}',"jerseyNumber"=${n},"position"=EXCLUDED."position","primaryPosition"=EXCLUDED."primaryPosition","updatedAt"=NOW();\n`

    sql += `INSERT INTO "PlayerCategory" ("playerId","friendlyCategoryId","createdAt")
SELECT p."id", '${catId}', NOW() FROM "Player" p WHERE p."id"='${plid}'
ON CONFLICT ("playerId","friendlyCategoryId") DO NOTHING;\n`
  }
}

sql += `INSERT INTO "User" ("id","email","passwordHash","name","isPlatformAdmin","updatedAt")
VALUES ('${ADMIN_USER_ID}', '${ADMIN_EMAIL}', '${PASSWORD_HASH}', '${ADMIN_NAME}', false, NOW())
ON CONFLICT ("email") DO UPDATE SET "name"=EXCLUDED."name","updatedAt"=NOW();\n`

sql += `INSERT INTO "OrganizationMembership" ("id","organizationId","userId","role","updatedAt")
SELECT '${ADMIN_MEM_ID}', o."id", u."id", 'ORG_ADMIN', NOW()
FROM "Organization" o
JOIN "User" u ON u."email"='${ADMIN_EMAIL}'
WHERE o."slug"='${SLUG}'
ON CONFLICT ("organizationId","userId") DO UPDATE SET "role"='ORG_ADMIN',"updatedAt"=NOW();\n`

sql += 'COMMIT;\n'

writeFileSync('supabase/.temp/seed-liga-kelme-sur.sql', sql)
console.log(`Generated ${sql.split('\n').length} lines → supabase/.temp/seed-liga-kelme-sur.sql`)
