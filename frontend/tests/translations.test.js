import { test } from 'node:test';
import assert from 'node:assert';
import { de } from '../src/context/translations/de.js';
import { ar } from '../src/context/translations/ar.js';

test('German and Arabic have exactly the same keys', () => {
  const onlyDe = Object.keys(de).filter((k) => !(k in ar));
  const onlyAr = Object.keys(ar).filter((k) => !(k in de));
  assert.deepStrictEqual({ onlyDe, onlyAr }, { onlyDe: [], onlyAr: [] });
});

test('no translation is empty', () => {
  for (const [lang, dict] of Object.entries({ de, ar })) {
    const empty = Object.entries(dict).filter(([, v]) => typeof v !== 'string' || !v.trim()).map(([k]) => k);
    assert.deepStrictEqual(empty, [], `${lang}: empty values`);
  }
});

test('Arabic strings are actually Arabic', () => {
  // brand names and codes may stay Latin, but most strings must contain Arabic script
  const arabic = Object.values(ar).filter((v) => /[؀-ۿ]/.test(v)).length;
  assert.ok(arabic / Object.keys(ar).length > 0.9, `only ${arabic} of ${Object.keys(ar).length} Arabic strings contain Arabic script`);
});
