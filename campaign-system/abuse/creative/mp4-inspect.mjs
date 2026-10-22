// Minimal ISO-BMFF reader for fragmented MP4 from MediaRecorder: video timescale (mdhd), codec (avc1),
// dimensions (tkhd), and duration = end of the last fragment (tfdt + summed trun/tfhd sample durations).
import { readFileSync } from 'node:fs';
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'moof', 'traf', 'mvex', 'edts']);
export function inspectMp4(path) {
  const b = readFileSync(path);
  const out = { ftyp: false, avc1: false, timescale: null, width: null, height: null, fragments: 0, samples: 0, end: 0 };
  let defaultDuration = 0;
  function walk(start, end, ctx) {
    let p = start;
    while (p + 8 <= end) {
      let size = b.readUInt32BE(p); const type = b.toString('latin1', p + 4, p + 8); let header = 8;
      if (size === 1) { size = Number(b.readBigUInt64BE(p + 8)); header = 16; } else if (size === 0) size = end - p;
      if (size < header || p + size > end) break;
      const body = p + header;
      if (type === 'ftyp') out.ftyp = true;
      if (type === 'stsd' && b.indexOf('avc1', body, 'latin1') !== -1 && b.indexOf('avc1', body, 'latin1') < p + size) out.avc1 = true;
      if (type === 'mdhd') { const v = b[body]; out.timescale = v === 1 ? b.readUInt32BE(body + 20) : b.readUInt32BE(body + 12); }
      if (type === 'tkhd') { const v = b[body]; const o = v === 1 ? body + 88 : body + 76; const w = b.readUInt32BE(o) / 65536, h = b.readUInt32BE(o + 4) / 65536; if (w && h) { out.width = w; out.height = h; } }
      if (type === 'trex') defaultDuration = b.readUInt32BE(body + 12);
      if (type === 'traf') ctx = { base: 0, dflt: defaultDuration };
      if (type === 'tfhd') { const flags = b.readUInt32BE(body) & 0xffffff; let o = body + 8; if (flags & 0x1) o += 8; if (flags & 0x2) o += 4; if (flags & 0x8) ctx.dflt = b.readUInt32BE(o); }
      if (type === 'tfdt') { const v = b[body]; ctx.base = v === 1 ? Number(b.readBigUInt64BE(body + 4)) : b.readUInt32BE(body + 4); }
      if (type === 'trun') {
        const flags = b.readUInt32BE(body) & 0xffffff; const count = b.readUInt32BE(body + 4); let o = body + 8;
        if (flags & 0x1) o += 4; if (flags & 0x4) o += 4;
        let sum = 0;
        for (let i = 0; i < count; i += 1) { let d = ctx.dflt; if (flags & 0x100) { d = b.readUInt32BE(o); o += 4; } if (flags & 0x200) o += 4; if (flags & 0x400) o += 4; if (flags & 0x800) o += 4; sum += d; }
        out.fragments += 1; out.samples += count; out.end = Math.max(out.end, ctx.base + sum);
      }
      if (CONTAINERS.has(type)) walk(body, p + size, ctx);
      p += size;
    }
  }
  walk(0, b.length, { base: 0, dflt: 0 });
  return { ...out, duration: out.timescale ? out.end / out.timescale : null };
}
if (import.meta.url === `file://${process.argv[1]}`) for (const f of process.argv.slice(2)) console.log(f.split('/').pop(), JSON.stringify(inspectMp4(f)));
