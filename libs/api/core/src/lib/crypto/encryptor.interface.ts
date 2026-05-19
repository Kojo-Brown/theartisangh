export const ENCRYPTOR = Symbol('ENCRYPTOR');

export interface Encryptor {
  /** Returns an opaque ciphertext blob containing IV + tag + body. */
  encrypt(plaintext: string): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<string>;
}
