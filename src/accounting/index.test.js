'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');

function run(inputs) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'index.js')], {
    input: inputs.length ? `${inputs.join('\n')}\n` : '',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

function balances(output) {
  return [...output.matchAll(/(?:Current balance: |New balance: )(\d+\.\d{2})/g)]
    .map((match) => match[1]);
}

test('UI-04: immediate exit performs no transaction and does not redisplay the menu', () => {
  const output = run(['4', '2', '250.00']);
  assert.equal(output.match(/Account Management System/g).length, 1);
  assert.equal(output.includes('Enter credit amount:'), false);
  assert.equal(output.includes('Enter debit amount:'), false);
  assert.deepEqual(balances(output), []);
  assert.equal(output.match(/Exiting the program\. Goodbye!/g).length, 1);
  assert.ok(output.endsWith('Exiting the program. Goodbye!\n'));
});

test('CR-03 / DB-06: zero-value transactions display success, including at zero balance', () => {
  const output = run(['2', '0.00', '3', '0.00', '3', '1000.00', '3', '0.00', '1', '4']);
  assert.equal(output.match(/Amount credited\. New balance: 1000\.00/g).length, 1);
  assert.equal(output.match(/Amount debited\. New balance: 1000\.00/g).length, 1);
  assert.equal(output.match(/Amount debited\. New balance: 0\.00/g).length, 2);
  assert.equal(output.includes('Insufficient funds'), false);
  assert.deepEqual(balances(output), ['1000.00', '1000.00', '0.00', '0.00', '0.00']);
});

test('menu, repeated views, invalid choices, and exit preserve the opening balance', () => {
  const output = run(['0', '5', '9', 'abc', '', '1.5', '12', '1', '1', '4', '2']);
  for (const label of [
    'Account Management System', '1. View Balance', '2. Credit Account',
    '3. Debit Account', '4. Exit', 'Enter your choice (1-4): ',
  ]) {
    assert.ok(output.includes(label), label);
  }
  assert.equal(output.match(/Invalid choice, please select 1-4\./g).length, 7);
  assert.deepEqual(balances(output), ['1000.00', '1000.00']);
  assert.equal(output.includes('Enter credit amount:'), false);
  assert.ok(output.endsWith('Exiting the program. Goodbye!\n'));
});

for (const [name, inputs, expected] of [
  ['whole credit', ['2', '250.00', '1'], ['1250.00', '1250.00']],
  ['cent carry', ['2', '0.99', '2', '0.01', '1'], ['1000.99', '1001.00', '1001.00']],
  ['whole debit', ['3', '250.00', '1'], ['750.00', '750.00']],
  ['cent borrow', ['3', '0.01', '1'], ['999.99', '999.99']],
  ['zero amounts and full debit', ['2', '0', '3', '0.00', '3', '1000', '3', '0', '1'],
    ['1000.00', '1000.00', '0.00', '0.00', '0.00']],
  ['mixed transactions', ['2', '125.50', '3', '25.25', '2', '0.75', '3', '101.00', '1'],
    ['1125.50', '1100.25', '1101.00', '1000.00', '1000.00']],
  ['menu return after operations', ['1', '2', '10.00', '3', '5.00', '1'],
    ['1000.00', '1010.00', '1005.00', '1005.00']],
]) {
  test(name, () => {
    const output = run([...inputs, '4']);
    assert.deepEqual(balances(output), expected);
    assert.equal(
      output.match(/Account Management System/g).length,
      expected.length + 1,
    );
    if (inputs.includes('2')) assert.ok(output.includes('Enter credit amount: '));
    if (inputs.includes('3')) assert.ok(output.includes('Enter debit amount: '));
  });
}

test('insufficient funds leave state unchanged and subsequent operations recover', () => {
  const output = run([
    '3', '1000.01', '3', '999999.99', '1',
    '2', '100', '3', '1100', '3', '0.01', '1', '4',
  ]);
  assert.equal(output.match(/Insufficient funds for this debit\./g).length, 3);
  assert.deepEqual(balances(output), ['1000.00', '1100.00', '0.00', '0.00']);
});

test('maximum balance is exact and overflow is rejected atomically', () => {
  const output = run(['2', '998999.99', '2', '0.01', '1', '3', '999999.99', '1', '4']);
  assert.ok(output.includes('Credit would exceed the maximum balance of 999999.99.'));
  assert.deepEqual(balances(output), ['999999.99', '999999.99', '0.00', '0.00']);
});

test('invalid amounts in either operation leave state unchanged and return to menu', () => {
  const invalid = [
    '-10.00', 'abc', '', '1.239', '1000000.00', '1,000.00', '$10.00',
    '1e2', 'Infinity', 'NaN', '10junk', '+10', '.50', '10.',
  ];
  for (const choice of ['2', '3']) {
    const inputs = invalid.flatMap((amount) => [choice, amount, '1']);
    const output = run([...inputs, '2', '0.1', '3', '0.01', '1', '4']);
    assert.equal(output.match(/Invalid amount\./g).length, invalid.length);
    assert.deepEqual(balances(output), [
      ...invalid.map(() => '1000.00'), '1000.10', '1000.09', '1000.09',
    ]);
  }
});

test('repeated cent transactions do not accumulate floating-point errors', () => {
  const inputs = Array.from({ length: 100 }, () => ['2', '0.01']).flat();
  const output = run([...inputs, '3', '1001.00', '1', '4']);
  assert.deepEqual(balances(output).slice(-3), ['1001.00', '0.00', '0.00']);
});

test('a new process resets the balance', () => {
  assert.deepEqual(balances(run(['2', '50', '1', '4'])), ['1050.00', '1050.00']);
  assert.deepEqual(balances(run(['1', '4'])), ['1000.00']);
});

test('end-of-input exits without looping or completing unfinished transactions', () => {
  for (const inputs of [[], ['2'], ['3']]) {
    const output = run(inputs);
    assert.equal(output.match(/Account Management System/g).length, 1);
    assert.deepEqual(balances(output), []);
    assert.equal(output.includes('Transaction cancelled: input ended.'), inputs.length > 0);
    assert.ok(output.endsWith('Exiting the program. Goodbye!\n'));
  }
});
