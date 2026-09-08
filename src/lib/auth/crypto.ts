/**
 * Credential primitives.
 *
 * SCOPE, STATED PLAINLY: this app has no backend, so sign-in is enforced in the
 * browser against records held in local storage. That gates the interface and
 * separates the admin console from a member's own view, but anyone with the
 * device can read local storage — it is NOT a security boundary against a
 * determined user. Every function here is written so the same call sites work
 * unchanged once a server owns the credential store: swap `verify` and the
 * store for API calls and nothing else in the app has to move.
 *
 * Passwords are never stored. Each account keeps a random salt plus a
 * PBKDF2-SHA-256 derivation, and verification is constant-time.
 */

const ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;

/** Unambiguous alphabet: no O/0, I/1, or similar look-alikes to mistype. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUP_SIZE = 4;
const GROUP_COUNT = 4;

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) {
    throw new Error(
      'Web Crypto is unavailable. Serve the dashboard over HTTPS or localhost so credentials can be hashed.',
    );
  }
  return api;
}

/** Cryptographically random bytes. */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * A uniformly random integer in [0, bound), by rejection sampling.
 * Plain modulo would bias the low end of the range, which matters when the
 * same helper picks a lucky-spin winner.
 */
export function randomBelow(bound: number): number {
  if (!Number.isInteger(bound) || bound <= 0) {
    throw new RangeError(`randomBelow needs a positive integer bound, received ${bound}`);
  }
  const limit = Math.floor(0xffff_ffff / bound) * bound;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % bound;
}

/** Pick one item uniformly at random. */
export function randomChoice<T>(items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('Cannot choose from an empty list.');
  return items[randomBelow(items.length)]!;
}

/**
 * A generated password: four groups of four, e.g. `K7QM-3XPD-9RTF-2HWZ`.
 * Sixteen characters from a 32-symbol alphabet is 80 bits of entropy, and the
 * grouping makes it readable over a phone call.
 */
export function generatePassword(): string {
  const groups: string[] = [];
  for (let group = 0; group < GROUP_COUNT; group += 1) {
    let chunk = '';
    for (let index = 0; index < GROUP_SIZE; index += 1) {
      chunk += PASSWORD_ALPHABET[randomBelow(PASSWORD_ALPHABET.length)];
    }
    groups.push(chunk);
  }
  return groups.join('-');
}

/**
 * A member id in the form `SS-100244`. The caller supplies the ids already in
 * use so the result is unique within the store.
 */
export function generateMemberId(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const candidate = `SS-${100_000 + randomBelow(900_000)}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not allocate a unique member id.');
}

export interface PasswordRecord {
  salt: string;
  hash: string;
  iterations: number;
}

/** Derive a storable record from a plaintext password. */
export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, ITERATIONS);
  return { salt: toBase64(salt), hash: toBase64(hash), iterations: ITERATIONS };
}

/** Constant-time verification of a password against a stored record. */
export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  const salt = fromBase64(record.salt);
  const expected = fromBase64(record.hash);
  const actual = await derive(password, salt, record.iterations);
  return timingSafeEqual(actual, expected);
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const api = subtle();
  const key = await api.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await api.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** Compares in time proportional to length only, never short-circuiting. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index]! ^ b[index]!;
  }
  return difference === 0;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
