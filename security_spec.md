# Security Specification - Turen Financeiro

## 1. Data Invariants
- All documents (contracts, entries, exits, installments, fixed_expenses) must be owned by a user (`userId` field).
- Users can only read and write their own data.
- Timestamps (`createdAt`, `updatedAt`) must be set by the server.
- Mandatory fields like `userId`, `valor`, and `cliente_nome` must exist and be of correct types.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a contract with a `userId` that is not the requester's UID.
2. **Resource Poisoning**: Attempt to create a document with a 2MB string as a ID.
3. **Ghost Field Injection**: Attempt to add an `isAdmin: true` field to a contract.
4. **Timestamp Manipulation**: Attempt to set `createdAt` to a date in the past from the client.
5. **Schema Violation**: Attempt to set `valor_total` as a string instead of a number.
6. **Orphaned Write**: Attempt to create an entry without a `userId`.
7. **Cross-User Leak (List)**: Attempt to query all contracts without filtering by `userId`.
8. **Cross-User Leak (Get)**: Attempt to 'get' a contract ID belonging to another user.
9. **Mutation Gap**: Attempt to update the `userId` of an existing contract.
10. **Type Poisoning**: Attempt to set `anexos` as a string instead of an array.
11. **Boundary Breach**: Attempt to set `quantidade` as a negative number.
12. **Enum Bypass**: Attempt to set `status` to "SuperVip" (not in defined enums).

## 3. Test Runner (Draft)
The `firestore.rules.test.ts` will verify these payloads are rejected with PERMISSION_DENIED.
