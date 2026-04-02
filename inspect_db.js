const pool = require('./config/db');

async function run() {
    try {
        const [schema] = await pool.query('DESCRIBE users');
        const roleCol = schema.find(c => c.Field === 'role');
        console.log('ROLE_TYPE:', roleCol.Type);
    } catch (e) {
        console.log('ERR:', e.message);
    } finally {
        process.exit(0);
    }
}

run();
