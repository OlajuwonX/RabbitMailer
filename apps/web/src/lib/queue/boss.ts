import "server-only";
import { PgBoss } from "pg-boss";

// Survives Next.js hot-reloads in dev: the Node.js process stays alive across module re-evaluations, so globalThis is the right place to cache the instance.
const g = globalThis as unknown as { boss?: PgBoss };

// Serializes concurrent getBoss() calls on a cold start so only one PgBoss instance is created even when multiple requests arrive simultaneously.
let _startPromise: Promise<PgBoss> | null = null;

// Single shared queue for all tenants. pg-boss v12 does not support wildcard patterns in
// boss.work() — getQueueCache() does a strict exact-name lookup. All tenant email jobs
// share this queue; tenantId is carried in job.data and used to scope all DB operations.
export const EMAIL_QUEUE = "send-email";

export async function getBoss(): Promise<PgBoss> {
  if (g.boss) return g.boss;
  if (!_startPromise) _startPromise = _start();
  return _startPromise;
}

async function _start(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    // The app side only schedules jobs — the Railway worker processes them. supervise: false prevents this instance from running the polling loop that would compete with the worker for job ownership.
    supervise: false,
    // Neon routes the app through PgBouncer in transaction-pooling mode. useListenNotify requires a session-pinned connection, which transaction pooling doesn't support — keep it off (also the default).
    useListenNotify: false,
  });

  try {
    await boss.start();
    // Queue must exist before insert() or work() — createQueue uses ON CONFLICT DO NOTHING so this is safe to call on every start.
    await boss.createQueue(EMAIL_QUEUE);
  } catch (err) {
    // Reset so the next getBoss() call can attempt a fresh start rather than returning a permanently rejected promise to all callers.
    _startPromise = null;
    throw err;
  }

  g.boss = boss;
  return boss;
}
