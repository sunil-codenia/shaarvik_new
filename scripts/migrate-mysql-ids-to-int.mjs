import mysql from 'mysql2/promise';

function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const parsed = new URL(connectionString);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: parsed.password ? decodeURIComponent(parsed.password) : '',
    database: parsed.pathname.replace(/^\//, ''),
  };
}

function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, '``')}\``;
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function sanitizeTempName(name) {
  return String(name).replace(/[^a-zA-Z0-9_]/g, '_');
}

function chooseOrderBy(columns) {
  const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));
  if (columnNames.has('created_at')) {
    return `${quoteIdentifier('created_at')}, ${quoteIdentifier('id')}`;
  }
  if (columnNames.has('createdAt')) {
    return `${quoteIdentifier('createdAt')}, ${quoteIdentifier('id')}`;
  }
  return quoteIdentifier('id');
}

async function main() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    const [columnRows] = await connection.query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        EXTRA,
        ORDINAL_POSITION
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    const [fkRows] = await connection.query(`
      SELECT
        k.CONSTRAINT_NAME,
        k.TABLE_NAME,
        k.COLUMN_NAME,
        k.REFERENCED_TABLE_NAME,
        k.REFERENCED_COLUMN_NAME,
        rc.UPDATE_RULE,
        rc.DELETE_RULE,
        k.ORDINAL_POSITION
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
        ON rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
       AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION
    `);

    const columnsByTable = new Map();
    for (const row of columnRows) {
      if (!columnsByTable.has(row.TABLE_NAME)) {
        columnsByTable.set(row.TABLE_NAME, []);
      }
      columnsByTable.get(row.TABLE_NAME).push(row);
    }

    const foreignKeysByTable = new Map();
    const foreignKeysByReferencedTable = new Map();
    for (const row of fkRows) {
      if (!foreignKeysByTable.has(row.TABLE_NAME)) {
        foreignKeysByTable.set(row.TABLE_NAME, []);
      }
      foreignKeysByTable.get(row.TABLE_NAME).push(row);

      if (!foreignKeysByReferencedTable.has(row.REFERENCED_TABLE_NAME)) {
        foreignKeysByReferencedTable.set(row.REFERENCED_TABLE_NAME, []);
      }
      foreignKeysByReferencedTable.get(row.REFERENCED_TABLE_NAME).push(row);
    }

    const idTables = [...columnsByTable.entries()]
      .filter(([, columns]) =>
        columns.some(
          (column) => column.COLUMN_NAME === 'id' && column.COLUMN_KEY === 'PRI'
        )
      )
      .map(([tableName]) => tableName);

    if (idTables.length === 0) {
      console.log('No primary-key id tables found. Nothing to migrate.');
      return;
    }

    console.log(
      `Migrating ${idTables.length} tables and ${fkRows.length} foreign keys to INT AUTO_INCREMENT ids...`
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
      for (const tableName of idTables) {
        const columns = columnsByTable.get(tableName) || [];
        const orderBy = chooseOrderBy(columns);
        const [rows] = await connection.query(
          `SELECT id FROM ${quoteIdentifier(tableName)} ORDER BY ${orderBy}`
        );

        if (rows.length === 0) {
          continue;
        }

        const mapping = rows.map((row, index) => [String(row.id), index + 1]);
        const tempName = `tmp_id_map_${sanitizeTempName(tableName)}`;

        await connection.query(`DROP TEMPORARY TABLE IF EXISTS ${quoteIdentifier(tempName)}`);
        await connection.query(`
          CREATE TEMPORARY TABLE ${quoteIdentifier(tempName)} (
            old_id VARCHAR(255) NOT NULL PRIMARY KEY,
            new_id INT NOT NULL UNIQUE
          ) ENGINE=InnoDB
        `);

        for (const batch of chunk(mapping, 500)) {
          const placeholders = batch.map(() => '(?, ?)').join(', ');
          const values = batch.flat();
          await connection.query(
            `INSERT INTO ${quoteIdentifier(tempName)} (old_id, new_id) VALUES ${placeholders}`,
            values
          );
        }

        await connection.query(
          `
            UPDATE ${quoteIdentifier(tableName)} t
            INNER JOIN ${quoteIdentifier(tempName)} m ON t.id = m.old_id
            SET t.id = m.new_id
          `
        );

        const childKeys = foreignKeysByReferencedTable.get(tableName) || [];
        for (const fk of childKeys) {
          await connection.query(
            `
              UPDATE ${quoteIdentifier(fk.TABLE_NAME)} c
              INNER JOIN ${quoteIdentifier(tempName)} m
                ON c.${quoteIdentifier(fk.COLUMN_NAME)} = m.old_id
              SET c.${quoteIdentifier(fk.COLUMN_NAME)} = m.new_id
            `
          );
        }
      }

      for (const fk of fkRows) {
        await connection.query(
          `ALTER TABLE ${quoteIdentifier(fk.TABLE_NAME)} DROP FOREIGN KEY ${quoteIdentifier(fk.CONSTRAINT_NAME)}`
        );
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    for (const tableName of idTables) {
      await connection.query(
        `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier('id')} INT NOT NULL AUTO_INCREMENT`
      );

      const [maxRows] = await connection.query(
        `SELECT COALESCE(MAX(id), 0) AS maxId FROM ${quoteIdentifier(tableName)}`
      );
      const maxId = Number(maxRows[0]?.maxId ?? 0);
      await connection.query(
        `ALTER TABLE ${quoteIdentifier(tableName)} AUTO_INCREMENT = ${Math.max(maxId + 1, 1)}`
      );
    }

    for (const fk of fkRows) {
      const columns = columnsByTable.get(fk.TABLE_NAME) || [];
      const column = columns.find((item) => item.COLUMN_NAME === fk.COLUMN_NAME);
      const nullable = column?.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';

      await connection.query(
        `
          ALTER TABLE ${quoteIdentifier(fk.TABLE_NAME)}
          MODIFY COLUMN ${quoteIdentifier(fk.COLUMN_NAME)} INT ${nullable}
        `
      );
    }

    for (const fk of fkRows) {
      const deleteRule = fk.DELETE_RULE ? ` ON DELETE ${fk.DELETE_RULE}` : '';
      const updateRule = fk.UPDATE_RULE ? ` ON UPDATE ${fk.UPDATE_RULE}` : '';

      await connection.query(
        `
          ALTER TABLE ${quoteIdentifier(fk.TABLE_NAME)}
          ADD CONSTRAINT ${quoteIdentifier(fk.CONSTRAINT_NAME)}
          FOREIGN KEY (${quoteIdentifier(fk.COLUMN_NAME)})
          REFERENCES ${quoteIdentifier(fk.REFERENCED_TABLE_NAME)} (${quoteIdentifier(
            fk.REFERENCED_COLUMN_NAME
          )})
          ${deleteRule}${updateRule}
        `
      );
    }

    console.log('Migration complete.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
