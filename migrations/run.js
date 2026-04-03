/**
 * Auto-Migration Runner
 * Runs all pending migrations on server startup.
 * Each migration runs only once — safe to re-run.
 */
const db = require('../config/db');

const migrations = [
    {
        name: '001_add_missing_columns_to_companies',
        up: async () => {
            // Add 'contact' column to companies table if it doesn't exist
            const [cols] = await db.query(`SHOW COLUMNS FROM companies LIKE 'contact'`);
            if (cols.length === 0) {
                await db.query(`ALTER TABLE companies ADD COLUMN contact VARCHAR(255) AFTER contact_person`);
                console.log('  ✅ Added "contact" column to companies');
            }

            // Add 'address' column to companies table if it doesn't exist
            const [cols2] = await db.query(`SHOW COLUMNS FROM companies LIKE 'address'`);
            if (cols2.length === 0) {
                await db.query(`ALTER TABLE companies ADD COLUMN address TEXT AFTER contact`);
                console.log('  ✅ Added "address" column to companies');
            }

            // Add 'business_name' column to companies table if it doesn't exist
            const [cols3] = await db.query(`SHOW COLUMNS FROM companies LIKE 'business_name'`);
            if (cols3.length === 0) {
                await db.query(`ALTER TABLE companies ADD COLUMN business_name VARCHAR(255) AFTER address`);
                console.log('  ✅ Added "business_name" column to companies');
            }
        }
    }
];

async function runMigrations() {
    try {
        // Create migrations tracking table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [completed] = await db.query('SELECT name FROM _migrations');
        const completedNames = new Set(completed.map(r => r.name));

        let count = 0;
        for (const migration of migrations) {
            if (completedNames.has(migration.name)) continue;
            console.log(`  ⏳ Running migration: ${migration.name}`);
            await migration.up();
            await db.query('INSERT INTO _migrations (name) VALUES (?)', [migration.name]);
            console.log(`  ✅ Completed: ${migration.name}`);
            count++;
        }

        if (count === 0) {
            console.log('  ✅ All migrations already applied');
        } else {
            console.log(`  ✅ ${count} migration(s) applied successfully`);
        }
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        // Don't crash the server — just log the error
    }
}

module.exports = runMigrations;
