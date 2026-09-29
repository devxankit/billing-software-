// Fields the server controls — never accepted from a request body
const PROTECTED_FIELDS = ["_id", "id", "owner", "createdAt", "updatedAt", "__v"];

/**
 * Copy of `body` without server-controlled fields (plus any `extra` keys).
 * Stops clients from reassigning ownership or flipping flags like `billed`.
 */
function stripProtected(body, extra = []) {
  const blocked = new Set([...PROTECTED_FIELDS, ...extra]);
  const clean = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (!blocked.has(key) && !key.startsWith("$")) clean[key] = value;
  }
  return clean;
}

module.exports = { stripProtected };
