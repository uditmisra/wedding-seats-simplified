const ADJ = ["luna","river","ivory","sage","amber","rose","willow","linen","velvet","plum","honey","silk","ember","dune","blush","aspen","wren","fern","clove","dahlia"];
const NOUN = ["meadow","garden","harbor","bloom","grove","circle","table","feast","ring","bay","field","crest","light","dance","wave","manor","loom","echo","verse","stone"];

// Crockford-ish base32 (no I, L, O, U) — unambiguous when shared verbally.
const ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";

function randomToken(len: number) {
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

/**
 * Plan codes: `<adj>-<noun>-<10-char random token>`.
 * The 10-char token from a 30-char alphabet provides ~49 bits of entropy
 * (~5.9e14 combinations), making brute-force enumeration of plans infeasible
 * even without rate limits.
 */
export function generatePlanCode() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const b = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a}-${b}-${randomToken(10)}`;
}