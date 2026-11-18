# COBOL student account system

The COBOL application provides a console menu for viewing, crediting, and
debiting a balance. In a student-account context, it represents a single
account: the code does not store student identities or distinguish between
multiple students.

## Programs and key routines

### [main.cob](../src/cobol/main.cob) — `MainProgram`

The entry point and user interface.

- `MAIN-LOGIC` repeats the menu until the user selects exit.
- Choice `1` calls `Operations` with `TOTAL ` to display the balance.
- Choice `2` calls `Operations` with `CREDIT` to add funds.
- Choice `3` calls `Operations` with `DEBIT ` to remove funds.
- Choice `4` sets `CONTINUE-FLAG` to `NO`, ends the loop, and terminates the
  application with `STOP RUN`.
- Other choices display an invalid-choice message and return to the menu.

### [operations.cob](../src/cobol/operations.cob) — `Operations`

Implements account operations and displays their results. Its unnamed
procedure body receives a six-character `PASSED-OPERATION` parameter:

| Operation | Behavior |
| --- | --- |
| `TOTAL ` | Reads the balance from `DataProgram` and displays it. |
| `CREDIT` | Accepts an amount, reads the balance, adds the amount, writes the updated balance, and displays it. |
| `DEBIT ` | Accepts an amount and reads the balance. If sufficient funds exist, subtracts the amount, writes the updated balance, and displays it; otherwise displays an insufficient-funds message. |

`AMOUNT` holds the transaction amount, and `FINAL-BALANCE` holds the working
balance. Each supported operation reads the stored balance before using it.
`GOBACK` returns control to the caller.

### [data.cob](../src/cobol/data.cob) — `DataProgram`

Owns the in-memory balance in `STORAGE-BALANCE`, initialized to `1000.00`.
Its unnamed procedure body receives an operation and a `BALANCE` parameter:

| Operation | Behavior |
| --- | --- |
| `READ` | Copies `STORAGE-BALANCE` into the caller's `BALANCE`. |
| `WRITE` | Copies the caller's `BALANCE` into `STORAGE-BALANCE`. |

`GOBACK` returns control to the caller. This program only transfers values;
the debit eligibility check belongs to `Operations`.

## Student-account business rules and limitations

- **Opening balance:** A new program run starts with `1000.00`.
- **Credits increase available funds:** The entered amount is added to the
  current balance.
- **Debits require sufficient funds:** A debit is allowed only when the
  balance is greater than or equal to the requested amount. Debiting the
  full balance is allowed and leaves zero.
- **Rejected debits do not change the balance:** An insufficient-funds
  request displays a message without writing a new balance.
- **Amounts have two decimal places:** Amounts and balances use unsigned
  COBOL `PIC 9(6)V99` fields, representing values from `0.00` to
  `999999.99`. No currency is specified.
- **Input and overflow checks are absent:** There are no explicit checks
  for nonnumeric input, negative input, a strictly positive transaction
  amount, or a credit exceeding the field's capacity. The unsigned field
  definition is not a substitute for input validation. Zero amounts are
  not explicitly rejected, and arithmetic has no `ON SIZE ERROR` handling.
- **Storage lasts only for the run:** Updates remain available across
  menu operations, but no file or database persists them after exit.
- **Student-specific policies are not implemented:** There are no student
  IDs, authentication, tuition categories, fees, interest, transaction
  history, or account-specific limits. These should not be assumed to be
  enforced by this application.

## Call flow

```text
MainProgram (menu)
    -> Operations (TOTAL / CREDIT / DEBIT)
        -> DataProgram (READ / WRITE)
```

Operation parameters are six-character fields. The trailing spaces in
`TOTAL ` and `DEBIT ` reflect the literals used by the source.

## Sequence diagram

```mermaid
sequenceDiagram
    actor User
    participant Main as MainProgram
    participant Ops as Operations
    participant Data as DataProgram

    Note over Data: In-memory balance starts at 1000.00
    loop Until the user selects Exit
        Main->>User: Display menu
        User->>Main: Enter choice
        alt View balance (1)
            Main->>Ops: TOTAL
            Ops->>Data: READ (FINAL-BALANCE)
            Data-->>Ops: Copy stored balance into FINAL-BALANCE
            Ops->>User: Display current balance
            Ops-->>Main: GOBACK
        else Credit account (2)
            Main->>Ops: CREDIT
            Ops->>User: Prompt for credit amount
            User->>Ops: Enter AMOUNT
            Ops->>Data: READ (FINAL-BALANCE)
            Data-->>Ops: Copy stored balance into FINAL-BALANCE
            Ops->>Ops: Add AMOUNT to FINAL-BALANCE
            Ops->>Data: WRITE (FINAL-BALANCE)
            Note over Data: Replace stored balance with FINAL-BALANCE
            Data-->>Ops: GOBACK
            Ops->>User: Display credit confirmation and new balance
            Ops-->>Main: GOBACK
        else Debit account (3)
            Main->>Ops: DEBIT
            Ops->>User: Prompt for debit amount
            User->>Ops: Enter AMOUNT
            Ops->>Data: READ (FINAL-BALANCE)
            Data-->>Ops: Copy stored balance into FINAL-BALANCE
            alt FINAL-BALANCE >= AMOUNT
                Ops->>Ops: Subtract AMOUNT from FINAL-BALANCE
                Ops->>Data: WRITE (FINAL-BALANCE)
                Note over Data: Replace stored balance with FINAL-BALANCE
                Data-->>Ops: GOBACK
                Ops->>User: Display debit confirmation and new balance
            else Insufficient funds
                Ops->>User: Display insufficient-funds message
                Note over Data: Stored balance is unchanged
            end
            Ops-->>Main: GOBACK
        else Exit (4)
            Main->>Main: Set CONTINUE-FLAG to NO
        else Invalid choice
            Main->>User: Display invalid-choice message
        end
    end
    Main->>User: Display goodbye message
    Note over Main,Data: STOP RUN ends the application; balance is not persisted
```
