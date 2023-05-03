const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.NEXT_PUBLIC_SUPABASE_POOL,
    ssl: {
        rejectUnauthorized: false,
    },
})
module.exports = {
    query: (text, params) => pool.query(text, params),
  };