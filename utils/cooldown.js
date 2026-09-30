// Almacén en RAM (volátil y ultra rápido)
const globalCooldowns = new Map();

/**
 * Verifica y aplica el cooldown de un usuario.
 * @param {string} userId - ID del usuario de Discord.
 * @param {number} cooldownMs - Tiempo de cooldown en milisegundos (Por defecto: 3000ms / 3s).
 * @returns {string|null} - Retorna un string formateado si está en cooldown (ej: "1.5"), o null si puede proceder.
 */
function checkUserCooldown(userId, cooldownMs = 3000) {
  const now = Date.now();

  if (globalCooldowns.has(userId)) {
    const expirationTime = globalCooldowns.get(userId);
    const remainingMs = expirationTime - now;

    // Si le faltan más de 100 milisegundos, aún está en cooldown
    if (remainingMs > 100) {
      // Math.max garantiza que nunca devuelva 0.0 (mínimo 0.1)
      const remainingSec = Math.max(0.1, remainingMs / 1000).toFixed(1);
      return remainingSec;
    }
  }

  // Si no está en cooldown o ya venció, establecemos el nuevo tiempo de expiración
  globalCooldowns.set(userId, now + cooldownMs);
  return null;
}

// 🧹 Limpieza automática periódica (cada 10 minutos)
// Evita fugas de memoria borrando usuarios inactivos sin necesidad de usar setTimeout por cada clic
setInterval(() => {
  const now = Date.now();
  for (const [userId, expirationTime] of globalCooldowns.entries()) {
    if (now >= expirationTime) {
      globalCooldowns.delete(userId);
    }
  }
}, 10 * 60 * 1000);

module.exports = { checkUserCooldown };