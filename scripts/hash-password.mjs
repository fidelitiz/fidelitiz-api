import { createHash, randomBytes } from 'node:crypto';

if (!process.stdout.isTTY) {
  console.error('Lancez ce script dans un terminal privé, hors des journaux CI.');
  process.exit(1);
}

const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const hash = createHash('sha256').update(salt).update(password).digest('base64');

console.log(`Mot de passe administrateur (à conserver dans un gestionnaire) : ${password}`);
console.log(`Secret Cloudflare ADMIN_PASSWORD_HASH : sha256-random$${salt.toString('base64')}$${hash}`);
