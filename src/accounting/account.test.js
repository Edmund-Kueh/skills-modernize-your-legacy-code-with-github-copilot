'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createAccount } = require('./index');

test('BAL-01 / DATA-01: reads replace caller values without changing stored balance', () => {
  const account = createAccount();
  let callerBalance = 4200;
  callerBalance = account.read();
  assert.equal(callerBalance, 100000);
  assert.equal(account.read(), 100000);
});

for (const [id, operation, amounts, expected] of [
  ['CR-01', 'credit', ['250.00'], [125000]],
  ['CR-02', 'credit', ['0.99', '0.01'], [100099, 100100]],
  ['CR-03', 'credit', ['0.00'], [100000]],
  ['CR-04', 'credit', ['998999.99'], [99999999]],
  ['DB-01', 'debit', ['250.00'], [75000]],
  ['DB-02', 'debit', ['0.01'], [99999]],
  ['DB-03', 'debit', ['1000.00'], [0]],
  ['DB-06', 'debit', ['0.00', '1000.00', '0.00'], [100000, 0, 0]],
]) {
  test(`${id}: ${operation} returns and stores the expected balance in cents`, () => {
    const account = createAccount();
    amounts.forEach((amount, index) => {
      assert.equal(account[operation](amount), expected[index]);
      assert.equal(account.read(), expected[index]);
    });
  });
}

for (const [id, amount] of [['DB-04', '1000.01'], ['DB-05', '999999.99']]) {
  test(`${id}: insufficient funds reject the debit without changing storage`, () => {
    const account = createAccount();
    assert.throws(() => account.debit(amount), {
      name: 'RangeError',
      message: 'Insufficient funds for this debit.',
    });
    assert.equal(account.read(), 100000);
  });
}

test('DB-07: a positive debit from zero is rejected without changing storage', () => {
  const account = createAccount();
  account.debit('1000.00');
  assert.throws(() => account.debit('0.01'), {
    name: 'RangeError',
    message: 'Insufficient funds for this debit.',
  });
  assert.equal(account.read(), 0);
});

test('FLOW-01: mixed transactions always use the latest stored balance', () => {
  const account = createAccount();
  assert.equal(account.credit('125.50'), 112550);
  assert.equal(account.debit('25.25'), 110025);
  assert.equal(account.credit('0.75'), 110100);
  assert.equal(account.debit('101.00'), 100000);
  assert.equal(account.read(), 100000);
});

test('FLOW-02: rejection does not prevent subsequent credit and full debit', () => {
  const account = createAccount();
  assert.throws(() => account.debit('1100.00'), {
    name: 'RangeError',
    message: 'Insufficient funds for this debit.',
  });
  assert.equal(account.read(), 100000);
  assert.equal(account.credit('100.00'), 110000);
  assert.equal(account.debit('1100.00'), 0);
  assert.equal(account.read(), 0);
});

test('FLOW-03: updates last for the account lifetime, not a new account', () => {
  const account = createAccount();
  account.credit('50.00');
  assert.equal(account.read(), 105000);
  assert.equal(createAccount().read(), 100000);
  assert.equal(account.read(), 105000);
});

test('DATA-02: writes replace stored values instead of adding to them', () => {
  const account = createAccount();
  account.write(12345);
  assert.equal(account.read(), 12345);
  account.write(2000);
  assert.equal(account.read(), 2000);
});

test('DATA-03: storage accepts both representable boundaries', () => {
  const account = createAccount();
  account.write(0);
  assert.equal(account.read(), 0);
  account.write(99999999);
  assert.equal(account.read(), 99999999);
});

test('OPS-01: operations use storage updates rather than an opening working balance', () => {
  const account = createAccount();
  account.write(20000);
  assert.equal(account.read(), 20000);
  assert.equal(account.credit('10.00'), 21000);
  assert.equal(account.debit('5.00'), 20500);
  assert.equal(account.read(), 20500);
});

for (const [id, amounts] of [
  ['GAP-02', ['-10.00']],
  ['GAP-03', ['abc', '']],
  ['GAP-04', ['1.239']],
  ['GAP-05', ['1000000.00']],
  ['GAP-07', ['1,000.00', '$10.00']],
]) {
  test(`${id}: approved validation rejects invalid amounts atomically for both operations`, () => {
    for (const operation of ['credit', 'debit']) {
      for (const amount of amounts) {
        const account = createAccount();
        assert.throws(() => account[operation](amount), {
          name: 'RangeError',
          message: 'Invalid amount. Enter 0 to 999999.99 with at most two decimal places.',
        });
        assert.equal(account.read(), 100000);
      }
    }
  });
}

test('GAP-06: overflow rejection preserves the maximum balance and allows recovery', () => {
  const account = createAccount();
  account.credit('998999.99');
  assert.throws(() => account.credit('0.01'), {
    name: 'RangeError',
    message: 'Credit would exceed the maximum balance of 999999.99.',
  });
  assert.equal(account.read(), 99999999);
  assert.equal(account.debit('0.01'), 99999998);
  assert.equal(account.credit('0.01'), 99999999);
});

test('storage rejects invalid cent values without replacing the existing balance', () => {
  const account = createAccount();
  account.write(12345);
  for (const value of [-1, 100000000, 1.5, NaN, Infinity, '12345', null]) {
    assert.throws(() => account.write(value), {
      name: 'RangeError',
      message: 'Balance must be integer cents from 0 to 99999999.',
    });
    assert.equal(account.read(), 12345);
  }
});

test('non-string transaction inputs are rejected without changing the balance', () => {
  const account = createAccount();
  for (const operation of ['credit', 'debit']) {
    for (const value of [undefined, null, 100, {}, []]) {
      assert.throws(() => account[operation](value), {
        name: 'RangeError',
        message: 'Invalid amount. Enter 0 to 999999.99 with at most two decimal places.',
      });
      assert.equal(account.read(), 100000);
    }
  }
});
