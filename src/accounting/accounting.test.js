const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  INITIAL_BALANCE_CENTS,
  MAX_BALANCE_CENTS,
  dataProgram,
  performOperation,
} = require('./index');

const applicationPath = path.join(__dirname, 'index.js');

function runApplication(input) {
  const result = spawnSync(process.execPath, [applicationPath], {
    input,
    encoding: 'utf8',
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  return result.stdout;
}

function terminalWithInput(input) {
  return { question: jest.fn().mockResolvedValue(input) };
}

describe('COBOL student account test plan', () => {
  beforeEach(() => {
    dataProgram('WRITE', INITIAL_BALANCE_CENTS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('TC-001 starts with the complete menu and opening balance', () => {
    const output = runApplication('4\n');

    expect(output).toContain('Account Management System');
    expect(output).toContain('1. View Balance');
    expect(output).toContain('2. Credit Account');
    expect(output).toContain('3. Debit Account');
    expect(output).toContain('4. Exit');
    expect(output).toContain('Enter your choice (1-4):');
    expect(dataProgram('READ')).toBe(100_000);
  });

  test('TC-002 views the unchanged opening balance and redisplays the menu', () => {
    const output = runApplication('1\n4\n');

    expect(output).toContain('Current balance: 1000.00');
    expect(output.match(/Account Management System/g)).toHaveLength(2);
  });

  test('TC-003 credits a positive amount and retains the new balance', () => {
    const output = runApplication('2\n250.50\n1\n4\n');

    expect(output).toContain('Amount credited. New balance: 1250.50');
    expect(output).toContain('Current balance: 1250.50');
  });

  test('TC-004 accumulates multiple credits in one session', () => {
    const output = runApplication('2\n100.00\n2\n50.25\n1\n4\n');

    expect(output).toContain('Current balance: 1150.25');
  });

  test('TC-005 debits less than the available balance', () => {
    const output = runApplication('3\n250.25\n1\n4\n');

    expect(output).toContain('Amount debited. New balance: 749.75');
    expect(output).toContain('Current balance: 749.75');
  });

  test('TC-006 debits exactly the available balance', () => {
    const output = runApplication('3\n1000.00\n1\n4\n');

    expect(output).toContain('Amount debited. New balance: 0.00');
    expect(output).toContain('Current balance: 0.00');
  });

  test('TC-007 rejects an overdraft without changing the balance', () => {
    const output = runApplication('3\n1000.01\n1\n4\n');

    expect(output).toContain('Insufficient funds for this debit.');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-008 accepts a zero-value credit', () => {
    const output = runApplication('2\n0.00\n1\n4\n');

    expect(output).toContain('Amount credited. New balance: 1000.00');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-009 accepts a zero-value debit', () => {
    const output = runApplication('3\n0.00\n1\n4\n');

    expect(output).toContain('Amount debited. New balance: 1000.00');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-010 preserves two decimal places without floating-point drift', () => {
    const output = runApplication('2\n0.01\n3\n0.02\n1\n4\n');

    expect(output).toContain('Current balance: 999.99');
  });

  test('TC-011 retains updates across different menu operations', () => {
    const output = runApplication('2\n200.00\n1\n3\n50.00\n1\n4\n');

    expect(output).toContain('Current balance: 1200.00');
    expect(output).toContain('Amount debited. New balance: 1150.00');
    expect(output).toContain('Current balance: 1150.00');
  });

  test('TC-012 resets the balance when the application restarts', () => {
    const firstRun = runApplication('2\n200.00\n4\n');
    const secondRun = runApplication('1\n4\n');

    expect(firstRun).toContain('Amount credited. New balance: 1200.00');
    expect(secondRun).toContain('Current balance: 1000.00');
    expect(secondRun).not.toContain('Current balance: 1200.00');
  });

  test('TC-013 rejects an out-of-range menu choice and continues', () => {
    const output = runApplication('5\n1\n4\n');

    expect(output).toContain('Invalid choice, please select 1-4.');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-014 exits without displaying another menu', () => {
    const output = runApplication('4\n');

    expect(output).toContain('Exiting the program. Goodbye!');
    expect(output.match(/Account Management System/g)).toHaveLength(1);
  });

  test('TC-015 reads stored balance without modifying it', () => {
    expect(dataProgram('READ')).toBe(100_000);
    expect(dataProgram('READ')).toBe(100_000);
  });

  test('TC-016 writes and reads a replacement balance', () => {
    dataProgram('WRITE', 432_109);

    expect(dataProgram('READ')).toBe(432_109);
  });

  test('TC-017 silently ignores an unsupported data operation', () => {
    expect(dataProgram('UNKNOWN', 25_000)).toBeUndefined();
    expect(dataProgram('READ')).toBe(100_000);
  });

  test('TC-018 silently ignores an unsupported account operation', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await performOperation('UNKNOWN', terminalWithInput('100.00'));

    expect(log).not.toHaveBeenCalled();
    expect(dataProgram('READ')).toBe(100_000);
  });

  test('TC-019 handles non-numeric menu input without changing balance', () => {
    const output = runApplication('A\n1\n4\n');

    expect(output).toContain('Invalid choice, please select 1-4.');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-020 rejects a negative transaction amount', () => {
    const output = runApplication('2\n-1.00\n1\n4\n');

    expect(output).toContain('Invalid amount. Enter up to six digits and two decimal places.');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-021 rejects a transaction with more than two decimal places', () => {
    const output = runApplication('2\n1.999\n1\n4\n');

    expect(output).toContain('Invalid amount. Enter up to six digits and two decimal places.');
    expect(output).toContain('Current balance: 1000.00');
  });

  test('TC-022 rejects a credit beyond the maximum representable balance', async () => {
    dataProgram('WRITE', MAX_BALANCE_CENTS);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await performOperation('CREDIT', terminalWithInput('0.01'));

    expect(log).toHaveBeenCalledWith('Credit would exceed the maximum account balance.');
    expect(dataProgram('READ')).toBe(MAX_BALANCE_CENTS);
  });

  test('TC-023 shares one balance across sequential users in a process', () => {
    const output = runApplication('2\n100.00\n1\n4\n');

    expect(output).toContain('Amount credited. New balance: 1100.00');
    expect(output).toContain('Current balance: 1100.00');
  });
});