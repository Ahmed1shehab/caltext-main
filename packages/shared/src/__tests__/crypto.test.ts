import { describe, expect, mock, test } from "bun:test";

mock.module("../env", () => ({
  env: {
    ENCRYPTION_KEY: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  },
}));

const { encrypt, decrypt, encryptContent } = await import("../crypto");

describe("encrypt / decrypt", () => {
  test("roundtrip returns original plaintext", async () => {
    const phone = "+14155551234";
    const encrypted = await encrypt(phone);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(phone);
  });

  test("deterministic — same input produces same ciphertext", async () => {
    const phone = "+14155551234";
    const a = await encrypt(phone);
    const b = await encrypt(phone);
    expect(a).toBe(b);
  });

  test("different inputs produce different ciphertexts", async () => {
    const a = await encrypt("+14155551234");
    const b = await encrypt("+14155559999");
    expect(a).not.toBe(b);
  });

  test("output is base64url (no +, /, or = characters)", async () => {
    const encrypted = await encrypt("+14155551234");
    expect(encrypted).not.toMatch(/[+/=]/);
  });

  test("encryptContent roundtrip", async () => {
    const text = '{"role":"user","content":"hello"}';
    const enc = await encryptContent(text);
    const dec = await decrypt(enc);
    expect(dec).toBe(text);
  });

  test("encryptContent is not deterministic", async () => {
    const text = "same";
    const a = await encryptContent(text);
    const b = await encryptContent(text);
    expect(a).not.toBe(b);
  });
});
