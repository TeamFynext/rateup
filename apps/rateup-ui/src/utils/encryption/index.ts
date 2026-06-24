async function initialize() {
  const sodiumModule = await import("libsodium-wrappers");
  const sodium = (sodiumModule as any).default ?? sodiumModule;
  await sodium.ready;
  return sodium;
}

// function to generate a keypair
export const generateKeyPair = async () => {
  const sodium = await initialize();
  const { publicKey: publickey, privateKey } = sodium.crypto_box_keypair();
  const publicKey = stringifyUint8Array(publickey);
  return { publicKey, privateKey };
};

// function to encrypt the survey response
export const encryptResponse = async (response: Array<QuestionResponse>, publicKey: any) => {
  try {
    publicKey = parsetoUint8Array(publicKey);
    const sodium = await initialize();
    const message = JSON.stringify(response);
    const cipherText = sodium.crypto_box_seal(message, publicKey);
    const encryptedResponse = stringifyUint8Array(cipherText);
    return { encryptedResponse };
  } catch (error) {
    return { error };
  }
};

// function to decrypt the survey response
export const decryptResponse = async (cipherText: any, privateKey: Uint8Array, publicKey: any) => {
  try {
    const sodium = await initialize();
    publicKey = parsetoUint8Array(publicKey);
    cipherText = parsetoUint8Array(cipherText);
    const decrypted = sodium.crypto_box_seal_open(cipherText, publicKey, privateKey, "text");
    const decryptedResponse: QuestionResponse[] = JSON.parse(decrypted);
    return { decryptedResponse };
  } catch (error) {
    return { error };
  }
};

// function to convert the password to a unisgned 8 bit array
export const passwordToKey = (password: string) => {
  const keyPassword = new Uint8Array(32);
  new TextEncoder().encodeInto(password, keyPassword);
  return { keyPassword };
};

// function to encrypt the private key
export const encryptPrivateKey = async (privateKey: Uint8Array, passkey: Uint8Array) => {
  try {
    const sodium = await initialize();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedPrivateKey = await sodium.crypto_secretbox_easy(privateKey, nonce, passkey);
    const nonceWithEncryptedPrivateKey = new Uint8Array(nonce.length + encryptedPrivateKey.length);
    nonceWithEncryptedPrivateKey.set(nonce);
    nonceWithEncryptedPrivateKey.set(encryptedPrivateKey, nonce.length);
    const nonceWithEncryptedPrivateKeyString = stringifyUint8Array(nonceWithEncryptedPrivateKey);
    return { nonceWithEncryptedPrivateKey: nonceWithEncryptedPrivateKeyString };
  } catch (error) {
    return { error };
  }
};

// function to decrypt the private key
export const decryptPrivateKey = async (nonceWithEncryptedPrivateKey: any, passkey: string) => {
  try {
    const sodium = await initialize();
    nonceWithEncryptedPrivateKey = parsetoUint8Array(nonceWithEncryptedPrivateKey);
    if (
      nonceWithEncryptedPrivateKey.length <
      sodium.crypto_secretbox_NONCEBYTES + sodium.crypto_secretbox_MACBYTES
    ) {
      throw new Error("Nonce and encrypted message must be at least 48 bytes");
    }
    const nonce = nonceWithEncryptedPrivateKey.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const encryptedPrivateKey = nonceWithEncryptedPrivateKey.slice(
      sodium.crypto_secretbox_NONCEBYTES,
    );
    const privateKey = sodium.crypto_secretbox_open_easy(
      encryptedPrivateKey,
      nonce,
      passwordToKey(passkey).keyPassword,
    );
    return { privateKey };
  } catch (error) {
    return { error };
  }
};

function stringifyUint8Array(array: Uint8Array) {
  return JSON.stringify(array, (k, v) => {
    if (v instanceof Uint8Array) {
      return Array.from(v);
    }
    return v;
  });
}

function parsetoUint8Array(string: string) {
  return JSON.parse(string, (k, v) => {
    if (Array.isArray(v)) {
      return new Uint8Array(v);
    }
    return v;
  });
}
