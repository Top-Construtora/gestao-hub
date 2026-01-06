const crypto = require('crypto');

/**
 * Gera um token único e seguro
 * @param {number} length - Tamanho do token em bytes (padrão: 32)
 * @returns {string} Token hexadecimal
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generateSecureToken
};