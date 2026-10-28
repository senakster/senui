// L10: npm packs a LICENSE only from the package's own folder, so each package's `prepack` copies
// the root LICENSE in. The copies are gitignored; the root file is the only one edited.
import { copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
copyFileSync(join(root, 'LICENSE'), join(process.cwd(), 'LICENSE'));
