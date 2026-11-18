function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function decodeKey(value: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  } catch {
    bytes = new TextEncoder().encode(value);
  }
  if (bytes.length !== 32) throw new Error("encryption_key_invalid");
  return bytes;
}

/** Returns a PostgREST bytea literal containing nonce || AES-GCM ciphertext. */
export async function encryptSecret(
  plaintext: string,
  keyMaterial: string,
): Promise<string> {
  if (!plaintext) throw new Error("secret_empty");
  const rawKey = decodeKey(keyMaterial);
  const keyData = rawKey.buffer.slice(
    rawKey.byteOffset,
    rawKey.byteOffset + rawKey.byteLength,
  ) as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce);
  packed.set(ciphertext, nonce.length);
  return `\\x${bytesToHex(packed)}`;
}
