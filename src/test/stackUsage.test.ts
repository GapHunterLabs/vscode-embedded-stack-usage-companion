import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSuFile, findBudgetViolations } from '../stackUsage';

const SAMPLE_SU = `main.c:10:5:foo	32	static
main.c:20:5:bar	1024	static
main.c:35:1:baz	64	dynamic,bounded
`;

test('parseSuFile reads every entry with its fields', () => {
  const entries = parseSuFile(SAMPLE_SU);
  assert.equal(entries.length, 3);
  assert.deepEqual(entries[0], { file: 'main.c', line: 10, functionName: 'foo', bytes: 32, qualifier: 'static' });
});

test('parseSuFile reads the dynamic,bounded qualifier correctly', () => {
  const entries = parseSuFile(SAMPLE_SU);
  assert.equal(entries[2].qualifier, 'dynamic,bounded');
  assert.equal(entries[2].functionName, 'baz');
});

test('parseSuFile skips blank lines', () => {
  const entries = parseSuFile('\n\n' + SAMPLE_SU + '\n\n');
  assert.equal(entries.length, 3);
});

test('parseSuFile skips a malformed line rather than throwing', () => {
  const entries = parseSuFile('not a valid .su line\n' + SAMPLE_SU);
  assert.equal(entries.length, 3);
});

test('findBudgetViolations flags only entries over the budget', () => {
  const entries = parseSuFile(SAMPLE_SU);
  const violations = findBudgetViolations(entries, 512);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].entry.functionName, 'bar');
});

test('findBudgetViolations reports nothing when everything is under budget', () => {
  const entries = parseSuFile(SAMPLE_SU);
  assert.deepEqual(findBudgetViolations(entries, 2048), []);
});

test('findBudgetViolations uses strictly-greater-than, not >=', () => {
  const entries = parseSuFile('main.c:1:1:exact\t512\tstatic\n');
  assert.deepEqual(findBudgetViolations(entries, 512), []);
});
