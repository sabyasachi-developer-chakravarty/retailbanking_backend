# Retail Banking Backend API Documentation

## Base URL

- `https://<your-backend-host>/api/v1`

---

## Authentication

### POST /auth/login

- Description: Authenticate a user and return a JWT token.
- Request body:
  - `username` (string, required)
  - `password` (string, required)
- Response:
  - `token` (string)
  - `user` object:
    - `id`
    - `username`
    - `email`
    - `firstName`
    - `lastName`
    - `role` (object with `name` and permissions)
- Errors:
  - `401` invalid credentials
  - `401` inactive user
  - `400` validation errors

### POST /auth/register

- Description: Register a new user.
- Request body:
  - `username` (string, min 3 characters)
  - `email` (string, valid email)
  - `password` (string, min 6 characters)
  - `firstName` (string)
  - `lastName` (string)
  - `role` (role ObjectId, required)
- Response:
  - `message`
  - `user` object
- Errors:
  - `400` invalid payload
  - `400` user already exists
  - `400` invalid role

### GET /auth/validate

- Description: Validate an existing JWT and return the current user.
- Headers:
  - `Authorization: Bearer <token>`
- Response:
  - `valid: true`
  - `user` object
- Errors:
  - `401` no token provided
  - `401` invalid or expired token
  - `401` inactive user

---

## Accounts

### GET /accounts

- Description: Get all accounts visible to the current user.
- Security: `Authorization: Bearer <token>`
- Notes:
  - `ADMIN` and `OPS` see all accounts.
  - `RM` can only see accounts belonging to its assigned customers.
- Response: Array of account objects.

### GET /accounts/:id

- Description: Get account details by account ID.
- Security: `Authorization: Bearer <token>`
- Notes:
  - `RM` is restricted to accounts for assigned customers.
- Response: Account object.
- Errors:
  - `404` account not found
  - `403` unauthorized for RM users on other accounts

### POST /accounts

- Description: Create a new account.
- Security: `Authorization: Bearer <token>`
- Permissions required: `create_transaction`
- Request body:
  - `customerId` (string)
  - `accountType` (string) e.g. `SAVINGS`, `CHECKING`, `MONEY_MARKET`
  - `initialBalance` (number)
- Response: Created account object.
- Errors:
  - `404` customer not found
  - `400` invalid payload
  - `403` insufficient permissions

### PATCH /accounts/:id/status

- Description: Update the status of an account.
- Security: `Authorization: Bearer <token>`
- Permissions required: `manage_accounts`
- Request body:
  - `accountStatus` (string) one of `ACTIVE`, `DORMANT`, `CLOSED`
- Response: Updated account object.
- Errors:
  - `400` invalid status
  - `404` account not found
  - `403` insufficient permissions

---

## Transactions

### GET /transactions/history/:accountId

- Description: Get transaction history for a specific account.
- Security: `Authorization: Bearer <token>`
- Query parameters:
  - `status` (optional)
  - `limit` (optional, default `50`)
  - `skip` (optional, default `0`)
- Notes:
  - `RM` can only access history for assigned customers.
- Response:
  - `transactions` array
  - `pagination` object

### POST /transactions/initiate

- Description: Initiate a new transaction.
- Security: `Authorization: Bearer <token>`
- Permissions required: `create_transaction`
- Request body:
  - `accountId` (string)
  - `type` (`DEBIT` or `CREDIT`)
  - `amount` (number)
  - `description` (string)
- Response: Created transaction object.
- Business rules:
  - Account must exist and be `ACTIVE`.
  - `DEBIT` cannot exceed the available balance.

### GET /transactions/pending/all

- Description: List all pending transactions.
- Security: `Authorization: Bearer <token>`
- Permissions required: `approve_transaction`
- Response: Array of pending transactions.

### POST /transactions/:transactionId/approve

- Description: Approve a pending transaction.
- Security: `Authorization: Bearer <token>`
- Permissions required: `approve_transaction`
- Request body:
  - `approvalNotes` (string)
- Response: Approved transaction object.
- Errors:
  - `404` transaction not found
  - `400` transaction cannot be approved

### POST /transactions/:transactionId/reject

- Description: Reject a pending transaction.
- Security: `Authorization: Bearer <token>`
- Permissions required: `reject_transaction`
- Request body:
  - `approvalNotes` (string)
- Response: Rejected transaction object.
- Errors:
  - `404` transaction not found
  - `400` transaction cannot be rejected

---

## Admin

> All admin routes require the user role `ADMIN`.

### GET /admin/users

- Description: List all users.
- Security: `Authorization: Bearer <token>`
- Response: Array of users with role data.

### POST /admin/users

- Description: Create a new user.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Request body:
  - `username`
  - `email`
  - `password`
  - `firstName`
  - `lastName`
  - `role` (Role ObjectId)
- Response: Created user object.
- Validation:
  - `username` min 3 chars
  - `password` min 6 chars
  - `email` must be valid

### PATCH /admin/users/:id

- Description: Update an existing user.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Request body may include:
  - `firstName`
  - `lastName`
  - `email`
  - `role`
  - `isActive` (boolean)
- Response: Updated user object.

### GET /admin/roles

- Description: List available role definitions.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Response: Array of roles.

### POST /admin/customers

- Description: Create a new customer.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Request body:
  - `firstName`
  - `lastName`
  - `email`
  - `phone`
  - `dateOfBirth`
  - `relationshipManager` (User ObjectId)
- Response: Created customer object.

### GET /admin/customers

- Description: List customers.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Response: Array of customers.

### GET /admin/audit-logs

- Description: Retrieve audit log entries.
- Security: `Authorization: Bearer <token>`
- Role required: `ADMIN`
- Response:
  - `logs` array
  - `pagination` object

---

## Security Model

### Authentication

- JWT-based authentication via `src/middleware/auth.js`.
- Token must be provided in the header:
  - `Authorization: Bearer <token>`
- If token is missing, invalid, expired, or belongs to an inactive user, the request is rejected.

### Authorization

- Implemented in `src/middleware/authorization.js`.
- `authorize(...)` checks permissions from the user role.
- `authorizeByRole(...)` checks specific role names.

### Roles and Permissions

- `ADMIN`:
  - full admin routes access
  - manage users, customers, roles, audit logs
- `OPS`:
  - approve/reject transactions
  - manage account status
- `RM`:
  - initiate transactions
  - view accounts/history only for assigned customers

Permissions used by the system:

- `view_accounts`
- `create_transaction`
- `approve_transaction`
- `reject_transaction`
- `view_all_accounts`
- `manage_accounts`
- `manage_users`
- `view_audit_logs`

### Additional protections

- Users must be active (`isActive = true`).
- Users without a role are blocked with `403`.
- Role-based checks are applied before sensitive operations.
- Account and transaction ownership checks prevent RM access outside assignments.

---

## Notes

- All protected endpoints require authentication.
- Admin endpoints require role-based authorization.
- Some endpoints require specific permissions rather than just authentication.
- Error responses generally use HTTP `400`, `401`, `403`, or `404` as appropriate.
