import { z } from 'zod'

/**
 * Regex pattern for ISO date format (YYYY-MM-DD).
 * Used for validating dates across multiple schemas.
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Regex pattern for IBAN format validation.
 * Validates basic IBAN structure: 2 uppercase letters + 2 digits + alphanumeric characters.
 * Note: This validates format only, not checksum.
 */
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]+$/

/**
 * Regex pattern for transaction date format.
 * Accepts both YYYY-MM-DD and YYYY-MM-DD HH:MM:SS formats.
 */
const TRANSACTION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/

/**
 * Validation schema for Person entities in the banking system.
 *
 * Represents individuals with Know Your Customer (KYC) information,
 * risk assessment, and investigation tracking.
 */
export const PersonSchema = z.object({
  /** Unique identifier for the person */
  person_id: z.string().trim().min(1, 'Person ID is required'),
  /** Social Security Number (optional) */
  ssn: z.string().optional(),
  /** Person's first name */
  first_name: z.string().trim().min(1, 'First name is required'),
  /** Person's last name */
  last_name: z.string().trim().min(1, 'Last name is required'),
  /** Date of birth in YYYY-MM-DD format */
  date_of_birth: z.string().regex(ISO_DATE_PATTERN, 'Date must be in YYYY-MM-DD format'),
  /** Country of nationality */
  nationality: z.string().trim().min(1, 'Nationality is required'),
  /** Risk assessment level for anti-money laundering (AML) purposes */
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    message: 'Risk level must be LOW, MEDIUM, HIGH, or CRITICAL'
  }),
  /** Current investigation status */
  investigation_status: z.enum(['NONE', 'MONITORING', 'ACTIVE', 'CLOSED'], {
    message: 'Investigation status must be NONE, MONITORING, ACTIVE, or CLOSED'
  }),
  /** Person's occupation (optional) */
  occupation: z.string().optional(),
  /** Known alias or alternative name (optional) */
  alias: z.string().optional(),
})

/**
 * Validation schema for Bank Account entities.
 *
 * Represents financial accounts with IBAN validation,
 * balance tracking, and status management.
 */
export const BankAccountSchema = z.object({
  /** Unique identifier for the account */
  account_id: z.string().trim().min(1, 'Account ID is required'),
  /** International Bank Account Number (IBAN) with format validation */
  iban: z.string().regex(IBAN_PATTERN, 'Invalid IBAN format (must start with 2 letters and 2 digits)'),
  /** Reference to the bank that holds this account */
  bank_id: z.string().trim().min(1, 'Bank ID is required'),
  /** Type of bank account */
  account_type: z.enum(['CHECKING', 'SAVINGS', 'BUSINESS'], {
    message: 'Account type must be CHECKING, SAVINGS, or BUSINESS'
  }),
  /** Country where the account is held */
  country: z.string().trim().min(1, 'Country is required'),
  /** Currency code (defaults to EUR) */
  currency: z.string().default('EUR'),
  /** Current balance (can be negative for overdrafts) */
  current_balance: z.number(),
  /** Date the account was opened in YYYY-MM-DD format */
  opened_date: z.string().regex(ISO_DATE_PATTERN, 'Date must be in YYYY-MM-DD format'),
  /** Date the account was closed (optional, YYYY-MM-DD format) */
  closed_date: z.string().regex(ISO_DATE_PATTERN, 'Date must be in YYYY-MM-DD format').optional(),
  /** Current status of the account */
  status: z.enum(['ACTIVE', 'CLOSED', 'FROZEN'], {
    message: 'Status must be ACTIVE, CLOSED, or FROZEN'
  }).default('ACTIVE'),
})

/**
 * Validation schema for Bank entities.
 *
 * Represents financial institutions with basic identifying information.
 */
export const BankSchema = z.object({
  /** Unique identifier for the bank */
  bank_id: z.string().trim().min(1, 'Bank ID is required'),
  /** Full legal name of the bank */
  name: z.string().trim().min(1, 'Bank name is required'),
  /** Country where the bank is registered */
  country: z.string().trim().min(1, 'Country is required'),
  /** Bank's routing number or sort code */
  routing_number: z.string().trim().min(1, 'Routing number is required'),
})

/**
 * Validation schema for Company entities.
 *
 * Represents corporate entities with registration details,
 * shell company flagging, and status tracking.
 */
export const CompanySchema = z.object({
  /** Unique identifier for the company */
  company_id: z.string().trim().min(1, 'Company ID is required'),
  /** Official registration number */
  registration_number: z.string().trim().min(1, 'Registration number is required'),
  /** Full legal name of the company */
  name: z.string().trim().min(1, 'Company name is required'),
  /** Country of incorporation */
  country: z.string().trim().min(1, 'Country is required'),
  /** Primary business sector or industry */
  business_type: z.string().trim().min(1, 'Business type is required'),
  /** Flag indicating if this is a shell company (used for AML screening) */
  is_shell_company: z.boolean({
    message: 'is_shell_company must be a boolean value'
  }),
  /** Date of incorporation in YYYY-MM-DD format */
  incorporation_date: z.string().regex(ISO_DATE_PATTERN, 'Date must be in YYYY-MM-DD format'),
  /** Current legal status of the company */
  status: z.enum(['ACTIVE', 'DISSOLVED', 'SUSPENDED'], {
    message: 'Status must be ACTIVE, DISSOLVED, or SUSPENDED'
  }).default('ACTIVE'),
})

/**
 * Validation schema for Transaction entities.
 *
 * Represents financial transactions between accounts with
 * IBAN validation, amount verification, and fraud flagging.
 */
export const TransactionSchema = z.object({
  /** Unique identifier for the transaction */
  transaction_id: z.string().trim().min(1, 'Transaction ID is required'),
  /** IBAN of the sending account */
  from_iban: z.string().regex(IBAN_PATTERN, 'Invalid IBAN format for from_iban'),
  /** IBAN of the receiving account */
  to_iban: z.string().regex(IBAN_PATTERN, 'Invalid IBAN format for to_iban'),
  /** Transaction amount (must be positive) */
  amount: z.number().positive('Amount must be positive'),
  /** Currency code (defaults to EUR) */
  currency: z.string().default('EUR'),
  /** Transaction date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format */
  date: z.string().regex(TRANSACTION_DATE_PATTERN, 'Date must be in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format'),
  /** Type of transaction */
  transaction_type: z.enum(['WIRE', 'TRANSFER', 'PAYMENT', 'CASH'], {
    message: 'Transaction type must be WIRE, TRANSFER, PAYMENT, or CASH'
  }),
  /** Transaction reference code (optional) */
  reference: z.string().optional(),
  /** Description or memo (optional) */
  description: z.string().optional(),
  /** Flag indicating if this transaction is flagged for review */
  is_flagged: z.boolean().default(false),
  /** Reason for flagging (optional) */
  flag_reason: z.string().optional(),
}).superRefine((data, ctx) => {
  // Enforce business rule: flag_reason should only be present when is_flagged is true
  if (data.flag_reason && !data.is_flagged) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['flag_reason'],
      message: 'flag_reason can only be provided when is_flagged is true',
    })
  }
})

/**
 * TypeScript type inferred from PersonSchema.
 * Represents a validated Person entity.
 */
export type Person = z.infer<typeof PersonSchema>

/**
 * TypeScript type inferred from BankAccountSchema.
 * Represents a validated Bank Account entity.
 */
export type BankAccount = z.infer<typeof BankAccountSchema>

/**
 * TypeScript type inferred from BankSchema.
 * Represents a validated Bank entity.
 */
export type Bank = z.infer<typeof BankSchema>

/**
 * TypeScript type inferred from CompanySchema.
 * Represents a validated Company entity.
 */
export type Company = z.infer<typeof CompanySchema>

/**
 * TypeScript type inferred from TransactionSchema.
 * Represents a validated Transaction entity.
 */
export type Transaction = z.infer<typeof TransactionSchema>

/**
 * Result type for batch validation operations.
 * Separates valid entities from invalid ones with detailed error information.
 *
 * @template T - The validated entity type
 */
export interface BatchValidationResult<T> {
  /** Array of successfully validated entities */
  valid: T[]
  /** Array of validation failures with original data and error details */
  invalid: Array<{
    /** Index of the item in the original array */
    index: number
    /** Original data that failed validation */
    data: unknown
    /** Zod validation issues (JSON-serializable) */
    issues: z.ZodIssue[]
  }>
}

/**
 * Creates a batch validator function for a given Zod schema.
 * This factory eliminates code duplication across batch validators.
 *
 * @template T - The validated entity type
 * @param schema - The Zod schema to validate against
 * @returns A batch validation function
 *
 * @example
 * ```ts
 * const validateCustomBatch = createBatchValidator(CustomSchema)
 * const result = validateCustomBatch(data)
 * ```
 */
function createBatchValidator<T>(
  schema: z.ZodType<T>
): (data: unknown[]) => BatchValidationResult<T> {
  return function (data: unknown[]): BatchValidationResult<T> {
    const valid: T[] = []
    const invalid: BatchValidationResult<T>['invalid'] = []

    data.forEach((item, index) => {
      const result = schema.safeParse(item)
      if (result.success) {
        valid.push(result.data)
      } else {
        invalid.push({ index, data: item, issues: result.error.issues })
      }
    })

    return { valid, invalid }
  }
}

/**
 * Validates an array of Person entities in batch.
 *
 * Useful for bulk data uploads (CSV/XLSX) where you need to process
 * multiple records and separate valid from invalid entries.
 *
 * @param data - Array of unknown data to validate as Person entities
 * @returns BatchValidationResult with valid Person[] and invalid entries with errors
 *
 * @example
 * ```ts
 * const result = validatePersonBatch(csvData)
 * console.log(`Valid: ${result.valid.length}, Invalid: ${result.invalid.length}`)
 * result.invalid.forEach(({ index, issues }) => {
 *   console.log(`Row ${index + 1}: ${issues[0]?.message}`)
 * })
 * ```
 */
export const validatePersonBatch = createBatchValidator(PersonSchema)

/**
 * Validates an array of BankAccount entities in batch.
 *
 * Performs IBAN validation and account type checking for multiple
 * bank account records simultaneously.
 *
 * @param data - Array of unknown data to validate as BankAccount entities
 * @returns BatchValidationResult with valid BankAccount[] and invalid entries
 *
 * @example
 * ```ts
 * const result = validateBankAccountBatch(xlsxData)
 * // Import only valid accounts
 * await importAccounts(result.valid)
 * // Log errors for manual review
 * logValidationErrors(result.invalid)
 * ```
 */
export const validateBankAccountBatch = createBatchValidator(BankAccountSchema)

/**
 * Validates an array of Bank entities in batch.
 *
 * Validates financial institution data for bulk imports.
 *
 * @param data - Array of unknown data to validate as Bank entities
 * @returns BatchValidationResult with valid Bank[] and invalid entries
 */
export const validateBankBatch = createBatchValidator(BankSchema)

/**
 * Validates an array of Company entities in batch.
 *
 * Checks corporate entity data including shell company flags
 * and registration details for multiple companies at once.
 *
 * @param data - Array of unknown data to validate as Company entities
 * @returns BatchValidationResult with valid Company[] and invalid entries
 */
export const validateCompanyBatch = createBatchValidator(CompanySchema)

/**
 * Validates an array of Transaction entities in batch.
 *
 * Validates financial transactions including IBAN format,
 * positive amounts, and transaction types for bulk processing.
 *
 * @param data - Array of unknown data to validate as Transaction entities
 * @returns BatchValidationResult with valid Transaction[] and invalid entries
 *
 * @example
 * ```ts
 * const result = validateTransactionBatch(transactionData)
 * // Process valid transactions
 * await processTransactions(result.valid)
 * // Flag invalid transactions for review
 * if (result.invalid.length > 0) {
 *   await flagForReview(result.invalid)
 * }
 * ```
 */
export const validateTransactionBatch = createBatchValidator(TransactionSchema)
