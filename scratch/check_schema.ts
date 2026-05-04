import { mysqlPool } from './src/lib/mysql';

async function main() {
  try {
    const [rows] = await mysqlPool.query('DESCRIBE invoices');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
