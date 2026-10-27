// All the encryption happens here, in the browser. The server only gets iv + ciphertext.
const DB_NAME = "cipher-chat";
const STORE = "keys";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// One identity per account, so two accounts in the same browser don't share a key.
// The private key is non-extractable: not even this page's own JS can read it out.
export async function loadOrCreateIdentity(username) {
  const db = await openDB();
  const name = "identity:" + username;
  let keys = await dbGet(db, name);
  if (!keys) {
    keys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
    await dbSet(db, name, keys);
  }
  return keys;
}

export function b64(buf) {
  let s = "";
  for (const byte of new Uint8Array(buf)) s += String.fromCharCode(byte);
  return btoa(s);
}

export function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function exportPub(publicKey) {
  return b64(await crypto.subtle.exportKey("raw", publicKey));
}

export function importPub(pubB64) {
  return crypto.subtle.importKey("raw", unb64(pubB64), { name: "ECDH", namedCurve: "P-256" }, true, []);
}

// "3fa2 91bc ..." - read it out loud to your friend to check nobody swapped keys
export async function fingerprint(pubB64) {
  const hash = await crypto.subtle.digest("SHA-256", unb64(pubB64));
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 32).match(/.{4}/g).join(" ");
}

export async function deriveSharedKey(privateKey, peerPublicKey) {
  const base = await crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    "HKDF",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode("cipher-chat v2") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// the "aad" ties a ciphertext to who sent it and who it's for, so the server
// can't replay alice->bob's message as if it was carol->bob's
export const aad = (from, to) => new TextEncoder().encode(`cipher-chat v2|${from}|${to}`);

export async function encryptText(key, text, additionalData) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, new TextEncoder().encode(text));
  return { iv: b64(iv), ct: b64(ct) };
}

export async function decryptText(key, iv, ct, additionalData) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData }, key, unb64(ct));
  return new TextDecoder().decode(pt);
}
