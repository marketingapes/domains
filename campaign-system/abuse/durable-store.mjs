// Local disk adapter for deterministic drafts and fictional fixtures. Not a Render deployment.
// setNx publishes a fully fsynced file by atomic hard-link; interrupted writes never publish JSON.
import { mkdir, open, readFile, rename, link, unlink, rm, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export async function createDiskStore(directory) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('store_directory_invalid');
  const file = key => join(root, createHash('sha256').update(key).digest('hex') + '.json');
  const missing = e => e.code === 'ENOENT';
  async function get(key) {
    try { const entry = JSON.parse(await readFile(file(key), 'utf8')); if (entry.key !== key) throw Error('store_key_conflict'); return entry.value; }
    catch (e) { if (missing(e)) return null; throw e; }
  }
  async function write(key, value, nx) {
    const temp = join(root, `.pending-${randomUUID()}`);
    const handle = await open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ key, value })); await handle.sync(); } finally { await handle.close(); }
    try {
      if (nx) { try { await link(temp, file(key)); } catch (e) { if (e.code === 'EEXIST') return false; throw e; } }
      else await rename(temp, file(key));
      const dir = await open(root, 'r'); try { await dir.sync(); } finally { await dir.close(); }
      return true;
    } finally { await unlink(temp).catch(e => { if (!missing(e)) throw e; }); }
  }
  async function withLock(key, task) {
    const lock = file('lock:' + key) + '.lock';
    try { await mkdir(lock, { mode: 0o700 }); } catch (e) { if (e.code === 'EEXIST') return { busy: true }; throw e; }
    try { return { busy: false, value: await task() }; }
    finally { await rm(lock, { recursive: true }); }
  }
  async function push(key, value) {
    // No silent lost append on contention. Caller retries the same stable event ID.
    const result = await withLock('append:' + key, async () => write(key, [...(await get(key) || []), value], false));
    if (result.busy) throw Error('store_append_busy_retry_same_event');
  }
  return Object.freeze({ get, set: (k,v) => write(k,v,false), setNx: (k,v) => write(k,v,true), push,
    range: async k => await get(k) || [], withLock, directory: root });
}
