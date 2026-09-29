/**
 * npm run validate:data [-- --write-todo] [-- --schema-only --dir <path>]
 *
 * Validates public/data/*.json (schemas, sources, cross-references, completeness) and
 * checks docs/DATA_TODO.md lists every unverified (null) value. Exits 1 on any issue.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DATA_FILE_NAMES,
  collectTodo,
  renderDataTodo,
  validateData,
  type DataFileName,
} from '../src/data/validate';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const dirIndex = args.indexOf('--dir');
const dir = dirIndex >= 0 ? (args[dirIndex + 1] ?? 'public/data') : 'public/data';
const schemaOnly = flag('--schema-only');
const todoPath = 'docs/DATA_TODO.md';

const raw: Partial<Record<DataFileName, unknown>> = {};
for (const name of DATA_FILE_NAMES) {
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) continue;
  try {
    raw[name] = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (err) {
    console.error(`✗ ${path}: invalid JSON (${String(err)})`);
    process.exit(1);
  }
}

if (flag('--write-todo')) {
  writeFileSync(todoPath, renderDataTodo(collectTodo(raw)));
  console.log(`wrote ${todoPath}`);
}

const issues = validateData(raw, {
  schemaOnly,
  ...(schemaOnly
    ? {}
    : { dataTodoMarkdown: existsSync(todoPath) ? readFileSync(todoPath, 'utf8') : '' }),
});

if (issues.length > 0) {
  for (const i of issues) console.error(`✗ ${i.file}${i.id ? ` [${i.id}]` : ''}: ${i.message}`);
  console.error(`\n${issues.length} problem${issues.length === 1 ? '' : 's'} in ${dir}`);
  process.exit(1);
}
const counts = DATA_FILE_NAMES.filter((n) => Array.isArray(raw[n]))
  .map((n) => `${n} ${(raw[n] as unknown[]).length}`)
  .join(', ');
console.log(
  `✓ data valid (${counts}); ${collectTodo(raw).length} unverified values in ${todoPath}`,
);
