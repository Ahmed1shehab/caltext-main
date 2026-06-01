import { getRedis } from "@caltext/db";

const LOCK_TTL = 60;
const DEDUP_TTL = 300;

/**
 * Atomically checks dedup + acquires a per-phone lock in a single pipeline.
 * Returns "duplicate" | "locked" | "acquired".
 * On "acquired", caller MUST call the returned `release` function when done.
 */
/** @param encryptedPhone — deterministic ciphertext from `encrypt(phone)`, never raw E.164 */
export async function acquireSlot(
  encryptedPhone: string,
  messageId?: string,
): Promise<{ status: "duplicate" | "locked" | "acquired"; release: () => Promise<void> }> {
  const redis = getRedis();
  const lockKey = `lock:${encryptedPhone}`;
  const dedupKey = messageId ? `dedup:${messageId}` : null;

  const pipeline = redis.pipeline();
  if (dedupKey) pipeline.set(dedupKey, "1", { nx: true, ex: DEDUP_TTL });
  pipeline.set(lockKey, "1", { nx: true, ex: LOCK_TTL });
  const results = await pipeline.exec();

  const dedupIdx = dedupKey ? 0 : -1;
  const lockIdx = dedupKey ? 1 : 0;

  const noop = async () => {};
  const dedupOk = dedupKey ? !!results[dedupIdx] : true;
  const lockOk = !!results[lockIdx];

  if (!dedupOk) {
    if (lockOk) await redis.del(lockKey);
    return { status: "duplicate", release: noop };
  }

  if (!lockOk) {
    if (dedupKey) await redis.del(dedupKey);
    return { status: "locked", release: noop };
  }

  return {
    status: "acquired",
    release: async () => {
      await redis.del(lockKey);
    },
  };
}
