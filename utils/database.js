const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/database.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    gold TEXT DEFAULT '0',
    level INTEGER DEFAULT 1,
    exp TEXT DEFAULT '0',
    prestige INTEGER DEFAULT 0,
    stat_points INTEGER DEFAULT 0,
    stats TEXT DEFAULT '{"atk":"10","def":"5","maxHp":"100"}',
    current_hp TEXT DEFAULT '100',
    equipment TEXT DEFAULT '{"weapon":null,"armor":null}',
    inventory TEXT DEFAULT '[]',
    active_buffs TEXT DEFAULT '[]',
    generators TEXT DEFAULT '{"mines":"1"}',
    pets TEXT DEFAULT '[]',
    equipped_pet TEXT DEFAULT 'null',
    last_collected INTEGER DEFAULT 0,
    last_hp_regen INTEGER DEFAULT 0
  );
`);

module.exports = db;