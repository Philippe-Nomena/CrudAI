const archiver = require("archiver");
const { Writable } = require("stream");

// ─── Helpers ────────────────────────────────────────────────────────────────

function toPascalCase(str) {
  return (
    str.charAt(0).toUpperCase() +
    str.slice(1).replace(/[_-](.)/g, (_, c) => c.toUpperCase())
  );
}

function toCamelCase(str) {
  return (
    str.charAt(0).toLowerCase() +
    str.slice(1).replace(/[_-](.)/g, (_, c) => c.toUpperCase())
  );
}

// Convertit un type JSON schema en type SQL
function toSQLType(type) {
  const map = {
    uuid: "UUID DEFAULT gen_random_uuid()",
    string: "VARCHAR(255)",
    text: "TEXT",
    integer: "INTEGER",
    decimal: "DECIMAL(10,2)",
    boolean: "BOOLEAN DEFAULT false",
    date: "DATE",
    timestamp: "TIMESTAMP DEFAULT NOW()",
  };
  return map[type] || "VARCHAR(255)";
}

// ─── Générateurs de fichiers ─────────────────────────────────────────────────

function generateMigration(entity) {
  const fields = entity.fields
    .map((f) => {
      let line = `  ${f.name} ${toSQLType(f.type)}`;
      if (f.primary) line += " PRIMARY KEY";
      if (!f.nullable && !f.primary) line += " NOT NULL";
      if (f.unique) line += " UNIQUE";
      return line;
    })
    .join(",\n");

  const fks = (entity.relations || [])
    .filter((r) => r.type === "belongsTo")
    .map(
      (r) =>
        `  ${r.foreignKey} UUID REFERENCES ${r.entity.toLowerCase()}s(id) ON DELETE CASCADE`,
    )
    .join(",\n");

  const allFields = fks ? `${fields},\n${fks}` : fields;

  return `-- Migration: Create ${entity.tableName} table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ${entity.tableName} (
${allFields}
);
`;
}

function generateModel(entity) {
  const name = toPascalCase(entity.name);
  const fields = entity.fields
    .map((f) => `    ${f.name}: DataTypes.${f.type.toUpperCase()}`)
    .join(",\n");

  return `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ${name} = sequelize.define('${name}', {
${fields}
}, {
  tableName: '${entity.tableName}',
  timestamps: true,
});

module.exports = ${name};
`;
}

function generateController(entity) {
  const name = toPascalCase(entity.name);
  const camel = toCamelCase(entity.name);

  return `const ${name} = require('../models/${name}');

// GET /api/${entity.tableName}
exports.getAll = async (req, res) => {
  try {
    const items = await ${name}.findAll();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/${entity.tableName}/:id
exports.getById = async (req, res) => {
  try {
    const item = await ${name}.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '${name} not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/${entity.tableName}
exports.create = async (req, res) => {
  try {
    const ${camel} = await ${name}.create(req.body);
    res.status(201).json(${camel});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/${entity.tableName}/:id
exports.update = async (req, res) => {
  try {
    const item = await ${name}.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '${name} not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/${entity.tableName}/:id
exports.remove = async (req, res) => {
  try {
    const item = await ${name}.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: '${name} not found' });
    await item.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
`;
}

function generateRoute(entity) {
  const name = toPascalCase(entity.name);
  const camel = toCamelCase(entity.name);

  return `const express = require('express');
const router = express.Router();
const ${camel}Controller = require('../controllers/${name}Controller');

router.get('/', ${camel}Controller.getAll);
router.get('/:id', ${camel}Controller.getById);
router.post('/', ${camel}Controller.create);
router.put('/:id', ${camel}Controller.update);
router.delete('/:id', ${camel}Controller.remove);

module.exports = router;
`;
}

function generateIndexJs(schema) {
  const routeImports = schema.entities
    .map(
      (e) =>
        `const ${toCamelCase(e.name)}Routes = require('./routes/${toPascalCase(e.name)}Route');`,
    )
    .join("\n");

  const routeUses = schema.entities
    .map((e) => `app.use('/api/${e.tableName}', ${toCamelCase(e.name)}Routes);`)
    .join("\n");

  return `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');

${routeImports}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

${routeUses}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log(\`Server running on http://localhost:\${PORT}\`));
});
`;
}

function generateDatabaseConfig() {
  return `const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = { sequelize };
`;
}

function generateEnv(schema) {
  return `PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${schema.projectName}
DB_USER=postgres
DB_PASSWORD=yourpassword
`;
}

function generatePackageJson(schema) {
  return JSON.stringify(
    {
      name: schema.projectName,
      version: "1.0.0",
      main: "src/index.js",
      scripts: {
        start: "node src/index.js",
        dev: "nodemon src/index.js",
      },
      dependencies: {
        express: "^4.18.2",
        cors: "^2.8.5",
        dotenv: "^16.3.1",
        sequelize: "^6.35.0",
        pg: "^8.11.3",
        "pg-hstore": "^2.3.4",
      },
      devDependencies: {
        nodemon: "^3.0.1",
      },
    },
    null,
    2,
  );
}

function generateReadme(schema) {
  const entityList = schema.entities
    .map((e) => `- **${e.name}** (\`/api/${e.tableName}\`)`)
    .join("\n");

  return `# ${schema.projectName}

API REST générée automatiquement.

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

Copie \`.env.example\` en \`.env\` et configure ta base de données PostgreSQL.

## Lancement

\`\`\`bash
npm run dev
\`\`\`

## Endpoints

${entityList}
`;
}

// ─── Fonction principale ─────────────────────────────────────────────────────

async function generateProject(schema) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const output = new Writable({
      write(chunk, _, cb) {
        chunks.push(chunk);
        cb();
      },
    });

    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("finish", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.pipe(output);

    const base = `${schema.projectName}/`;

    archive.append(generatePackageJson(schema), {
      name: `${base}package.json`,
    });
    archive.append(generateEnv(schema), { name: `${base}.env.example` });
    archive.append(generateReadme(schema), { name: `${base}README.md` });
    archive.append(generateDatabaseConfig(), {
      name: `${base}src/config/database.js`,
    });
    archive.append(generateIndexJs(schema), { name: `${base}src/index.js` });

    for (const entity of schema.entities) {
      const name = toPascalCase(entity.name);
      archive.append(generateMigration(entity), {
        name: `${base}migrations/${entity.tableName}.sql`,
      });
      archive.append(generateModel(entity), {
        name: `${base}src/models/${name}.js`,
      });
      archive.append(generateController(entity), {
        name: `${base}src/controllers/${name}Controller.js`,
      });
      archive.append(generateRoute(entity), {
        name: `${base}src/routes/${name}Route.js`,
      });
    }

    archive.finalize();
  });
}

module.exports = { generateProject };
