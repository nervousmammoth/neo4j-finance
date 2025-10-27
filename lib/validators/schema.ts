import { z } from 'zod'

/**
 * Validation schema for Person entities in the banking system.
 *
 * Represents individuals with Know Your Customer (KYC) information,
 * risk assessment, and investigation tracking.
 */
export const PersonSchema = z.object({
  /** Unique identifier for the person */
  person_id: z.string().min(1, 'Person ID is required'),
  /** Social Security Number (optional) */
  ssn: z.string().optional(),
  /** Person's first name */
  first_name: z.string().min(1, 'First name is required'),
  /** Person's last name */
  last_name: z.string().min(1, 'Last name is required'),
  /** Date of birth in YYYY-MM-DD format */
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  /** Country of nationality */
  nationality: z.string().min(1, 'Nationality is required'),
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
  account_id: z.string().min(1, 'Account ID is required'),
  /** International Bank Account Number (IBAN) with format validation */
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Invalid IBAN format (must start with 2 letters and 2 digits)'),
  /** Reference to the bank that holds this account */
  bank_id: z.string().min(1, 'Bank ID is required'),
  /** Type of bank account */
  account_type: z.enum(['CHECKING', 'SAVINGS', 'BUSINESS'], {
    message: 'Account type must be CHECKING, SAVINGS, or BUSINESS'
  }),
  /** Country where the account is held */
  country: z.string().min(1, 'Country is required'),
  /** Currency code (defaults to EUR) */
  currency: z.string().default('EUR'),
  /** Current balance (can be negative for overdrafts) */
  current_balance: z.number(),
  /** Date the account was opened in YYYY-MM-DD format */
  opened_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  /** Date the account was closed (optional, YYYY-MM-DD format) */
  closed_date: z.string().optional(),
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
  bank_id: z.string().min(1, 'Bank ID is required'),
  /** Full legal name of the bank */
  name: z.string().min(1, 'Bank name is required'),
  /** Country where the bank is registered */
  country: z.string().min(1, 'Country is required'),
  /** Bank's routing number or sort code */
  routing_number: z.string().min(1, 'Routing number is required'),
})

/**
 * Validation schema for Company entities.
 *
 * Represents corporate entities with registration details,
 * shell company flagging, and status tracking.
 */
export const CompanySchema = z.object({
  /** Unique identifier for the company */
  company_id: z.string().min(1, 'Company ID is required'),
  /** Official registration number */
  registration_number: z.string().min(1, 'Registration number is required'),
  /** Full legal name of the company */
  name: z.string().min(1, 'Company name is required'),
  /** Country of incorporation */
  country: z.string().min(1, 'Country is required'),
  /** Primary business sector or industry */
  business_type: z.string().min(1, 'Business type is required'),
  /** Flag indicating if this is a shell company (used for AML screening) */
  is_shell_company: z.boolean({
    message: 'is_shell_company must be a boolean value'
  }),
  /** Date of incorporation in YYYY-MM-DD format */
  incorporation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
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
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  /** IBAN of the sending account */
  from_iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Invalid IBAN format for from_iban'),
  /** IBAN of the receiving account */
  to_iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Invalid IBAN format for to_iban'),
  /** Transaction amount (must be positive) */
  amount: z.number().positive('Amount must be positive'),
  /** Currency code (defaults to EUR) */
  currency: z.string().default('EUR'),
  /** Transaction date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/, 'Date must be in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format'),
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
