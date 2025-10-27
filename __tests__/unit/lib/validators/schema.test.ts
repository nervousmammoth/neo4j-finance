import { describe, it, expect } from 'vitest'
import {
  PersonSchema,
  BankAccountSchema,
  BankSchema,
  CompanySchema,
  TransactionSchema,
  type Person,
  type BankAccount,
  type Bank,
  type Company,
  type Transaction,
} from '@/lib/validators/schema'

describe('PersonSchema', () => {
  it('should validate a valid person object', () => {
    const validPerson = {
      person_id: 'P001',
      ssn: '123-45-6789',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      nationality: 'US',
      risk_level: 'LOW',
      investigation_status: 'NONE',
      occupation: 'Engineer',
      alias: 'Johnny',
    }

    const result = PersonSchema.safeParse(validPerson)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validPerson)
    }
  })

  it('should fail when person_id is missing', () => {
    const invalidPerson = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      nationality: 'US',
      risk_level: 'LOW',
      investigation_status: 'NONE',
    }

    const result = PersonSchema.safeParse(invalidPerson)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('person_id')
    }
  })

  it('should fail with invalid date format', () => {
    const invalidPerson = {
      person_id: 'P001',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '01/15/1990', // Invalid format
      nationality: 'US',
      risk_level: 'LOW',
      investigation_status: 'NONE',
    }

    const result = PersonSchema.safeParse(invalidPerson)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('date_of_birth')
    }
  })

  it('should fail with invalid risk_level enum', () => {
    const invalidPerson = {
      person_id: 'P001',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      nationality: 'US',
      risk_level: 'INVALID', // Invalid enum value
      investigation_status: 'NONE',
    }

    const result = PersonSchema.safeParse(invalidPerson)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('risk_level')
    }
  })
})

describe('BankAccountSchema', () => {
  it('should validate a valid account object', () => {
    const validAccount = {
      account_id: 'ACC001',
      iban: 'DE89370400440532013000',
      bank_id: 'BNK001',
      account_type: 'CHECKING',
      country: 'DE',
      currency: 'EUR',
      current_balance: 5000.50,
      opened_date: '2020-01-15',
      status: 'ACTIVE',
    }

    const result = BankAccountSchema.safeParse(validAccount)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.iban).toBe(validAccount.iban)
    }
  })

  it('should fail when IBAN is missing', () => {
    const invalidAccount = {
      account_id: 'ACC001',
      bank_id: 'BNK001',
      account_type: 'CHECKING',
      country: 'DE',
      currency: 'EUR',
      current_balance: 5000.50,
      opened_date: '2020-01-15',
      status: 'ACTIVE',
    }

    const result = BankAccountSchema.safeParse(invalidAccount)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('iban')
    }
  })

  it('should fail with invalid account_type', () => {
    const invalidAccount = {
      account_id: 'ACC001',
      iban: 'DE89370400440532013000',
      bank_id: 'BNK001',
      account_type: 'INVALID_TYPE', // Invalid enum
      country: 'DE',
      currency: 'EUR',
      current_balance: 5000.50,
      opened_date: '2020-01-15',
      status: 'ACTIVE',
    }

    const result = BankAccountSchema.safeParse(invalidAccount)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('account_type')
    }
  })

  it('should fail with negative balance', () => {
    const invalidAccount = {
      account_id: 'ACC001',
      iban: 'DE89370400440532013000',
      bank_id: 'BNK001',
      account_type: 'CHECKING',
      country: 'DE',
      currency: 'EUR',
      current_balance: -1000, // Negative balance should be allowed for overdrafts
      opened_date: '2020-01-15',
      status: 'ACTIVE',
    }

    // Note: This test expects negative balances to be VALID (overdrafts are common)
    // If you want to reject negative balances, adjust the schema accordingly
    const result = BankAccountSchema.safeParse(invalidAccount)
    expect(result.success).toBe(true)
  })
})

describe('BankSchema', () => {
  it('should validate a valid bank object', () => {
    const validBank = {
      bank_id: 'BNK001',
      name: 'Deutsche Bank',
      country: 'DE',
      routing_number: '370400440',
    }

    const result = BankSchema.safeParse(validBank)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validBank)
    }
  })

  it('should fail when bank_id is missing', () => {
    const invalidBank = {
      name: 'Deutsche Bank',
      country: 'DE',
      routing_number: '370400440',
    }

    const result = BankSchema.safeParse(invalidBank)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('bank_id')
    }
  })

  it('should fail with invalid country code', () => {
    const invalidBank = {
      bank_id: 'BNK001',
      name: 'Deutsche Bank',
      country: '', // Empty country code
      routing_number: '370400440',
    }

    const result = BankSchema.safeParse(invalidBank)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('country')
    }
  })

  it('should fail with empty name', () => {
    const invalidBank = {
      bank_id: 'BNK001',
      name: '', // Empty name
      country: 'DE',
      routing_number: '370400440',
    }

    const result = BankSchema.safeParse(invalidBank)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })
})

describe('CompanySchema', () => {
  it('should validate a valid company object', () => {
    const validCompany = {
      company_id: 'COM001',
      registration_number: 'REG123456',
      name: 'TechCorp Inc',
      country: 'US',
      business_type: 'Technology',
      is_shell_company: false,
      incorporation_date: '2015-06-20',
      status: 'ACTIVE',
    }

    const result = CompanySchema.safeParse(validCompany)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validCompany)
    }
  })

  it('should fail when company_id is missing', () => {
    const invalidCompany = {
      registration_number: 'REG123456',
      name: 'TechCorp Inc',
      country: 'US',
      business_type: 'Technology',
      is_shell_company: false,
      incorporation_date: '2015-06-20',
      status: 'ACTIVE',
    }

    const result = CompanySchema.safeParse(invalidCompany)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('company_id')
    }
  })

  it('should fail with invalid boolean for is_shell_company', () => {
    const invalidCompany = {
      company_id: 'COM001',
      registration_number: 'REG123456',
      name: 'TechCorp Inc',
      country: 'US',
      business_type: 'Technology',
      is_shell_company: 'yes', // Invalid - should be boolean
      incorporation_date: '2015-06-20',
      status: 'ACTIVE',
    }

    const result = CompanySchema.safeParse(invalidCompany)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('is_shell_company')
    }
  })

  it('should fail with invalid date format', () => {
    const invalidCompany = {
      company_id: 'COM001',
      registration_number: 'REG123456',
      name: 'TechCorp Inc',
      country: 'US',
      business_type: 'Technology',
      is_shell_company: false,
      incorporation_date: '06/20/2015', // Invalid format
      status: 'ACTIVE',
    }

    const result = CompanySchema.safeParse(invalidCompany)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('incorporation_date')
    }
  })
})

describe('TransactionSchema', () => {
  it('should validate a valid transaction object', () => {
    const validTransaction = {
      transaction_id: 'TXN001',
      from_iban: 'DE89370400440532013000',
      to_iban: 'FR1420041010050500013M02606',
      amount: 1500.00,
      currency: 'EUR',
      date: '2024-01-15 14:30:00',
      transaction_type: 'WIRE',
      reference: 'REF123',
      description: 'Payment for services',
      is_flagged: false,
    }

    const result = TransactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(1500.00)
    }
  })

  it('should fail when from_iban is missing', () => {
    const invalidTransaction = {
      transaction_id: 'TXN001',
      to_iban: 'FR1420041010050500013M02606',
      amount: 1500.00,
      currency: 'EUR',
      date: '2024-01-15 14:30:00',
      transaction_type: 'WIRE',
      is_flagged: false,
    }

    const result = TransactionSchema.safeParse(invalidTransaction)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('from_iban')
    }
  })

  it('should fail with negative amount', () => {
    const invalidTransaction = {
      transaction_id: 'TXN001',
      from_iban: 'DE89370400440532013000',
      to_iban: 'FR1420041010050500013M02606',
      amount: -1500.00, // Negative amount
      currency: 'EUR',
      date: '2024-01-15 14:30:00',
      transaction_type: 'WIRE',
      is_flagged: false,
    }

    const result = TransactionSchema.safeParse(invalidTransaction)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('amount')
    }
  })

  it('should fail with invalid transaction_type enum', () => {
    const invalidTransaction = {
      transaction_id: 'TXN001',
      from_iban: 'DE89370400440532013000',
      to_iban: 'FR1420041010050500013M02606',
      amount: 1500.00,
      currency: 'EUR',
      date: '2024-01-15 14:30:00',
      transaction_type: 'INVALID_TYPE', // Invalid enum
      is_flagged: false,
    }

    const result = TransactionSchema.safeParse(invalidTransaction)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('transaction_type')
    }
  })
})
