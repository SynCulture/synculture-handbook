import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(await readFile(new URL('./sc-runtime.json', import.meta.url)));
// Resolved against this file, so the script works from a bare clone of the
// handbook as well as from inside the website that consumes it as a submodule.
const directory = new URL('../runtime/sc/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const file of manifest.files) {
  const destination = new URL(file.name, directory);
  const hash = data => createHash('sha256').update(data).digest('hex');
  const existing = await readFile(destination).catch(() => null);
  if (existing && hash(existing) === file.sha256) { console.log(`Verified ${file.name}`); continue; }
  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`Download failed: ${file.name} (${response.status})`);
  const data = Buffer.from(await response.arrayBuffer());
  if (hash(data) !== file.sha256) throw new Error(`Upstream ${file.name} changed. Review the new build before updating the manifest.`);
  const temporary = new URL(file.name + '.download', directory);
  await writeFile(temporary, data);
  await rename(temporary, destination);
  console.log(`Downloaded and verified ${file.name}`);
}
