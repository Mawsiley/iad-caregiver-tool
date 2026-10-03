// Generates the settings-admin password hash for Netlify environment variables.
// Run it yourself — the password never leaves your computer:
//   node scripts/admin-hash.mjs "your-admin-password"
import crypto from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usage: node scripts/admin-hash.mjs "<password of at least 10 characters>"');
  process.exit(1);
}
const salt = crypto.randomBytes(32).toString('hex');
const pepper = crypto.randomBytes(32).toString('hex');
const hash = crypto.pbkdf2Sync(pepper + password, salt, 120000, 64, 'sha512').toString('hex');

console.log('\nAdd these in Netlify → Project configuration → Environment variables:\n');
console.log(`SETTINGS_ADMIN_PASSWORD_HASH=${hash}`);
console.log(`SETTINGS_ADMIN_PASSWORD_SALT=${salt}`);
console.log(`SETTINGS_ADMIN_PEPPER=${pepper}\n`);
