import { mkdir, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class Store {
  constructor(directory) { this.directory = path.resolve(directory); }
  async save(id, map) {
    await mkdir(this.directory, { recursive: true });
    const temporary = path.join(this.directory, `${id}.${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(map, null, 2), 'utf8');
    await rename(temporary, path.join(this.directory, `${id}.json`));
  }
  async get(id) {
    if (!/^[a-f0-9]{20}$/.test(id)) return null;
    try { return JSON.parse(await readFile(path.join(this.directory, `${id}.json`), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async list() {
    await mkdir(this.directory, { recursive: true });
    const files = (await readdir(this.directory)).filter(f => /^[a-f0-9]{20}\.json$/.test(f));
    const maps = await Promise.all(files.map(async f => ({ id: f.slice(0, -5), mapa: await this.get(f.slice(0, -5)) })));
    return maps.sort((a,b) => b.mapa.sitio.crawleado_en.localeCompare(a.mapa.sitio.crawleado_en));
  }
}
