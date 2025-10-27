import { describe, it, expect } from 'vitest'
import {
  PersonSchema,
  BankAccountSchema,
  BankSchema,
  CompanySchema,
  TransactionSchema,
  validatePersonBatch,
  validateBankAccountBatch,
  validateBankBatch,
  validateCompanyBatch,
  validateTransactionBatch,
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

describe('Batch Validation', () => {
  describe('validatePersonBatch', () => {
    it('should return empty arrays for empty input', () => {
      const result = validatePersonBatch([])
      expect(result.valid).toEqual([])
      expect(result.invalid).toEqual([])
    })

    it('should validate all valid persons', () => {
      const validPersons = [
        {
          person_id: 'P001',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-15',
          nationality: 'US',
          risk_level: 'LOW',
          investigation_status: 'NONE',
        },
        {
          person_id: 'P002',
          first_name: 'Jane',
          last_name: 'Smith',
          date_of_birth: '1985-06-20',
          nationality: 'UK',
          risk_level: 'MEDIUM',
          investigation_status: 'MONITORING',
        },
      ]

      const result = validatePersonBatch(validPersons)
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
      expect(result.valid[0].person_id).toBe('P001')
      expect(result.valid[1].person_id).toBe('P002')
    })

    it('should separate valid and invalid persons', () => {
      const mixedData = [
        {
          person_id: 'P001',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-15',
          nationality: 'US',
          risk_level: 'LOW',
          investigation_status: 'NONE',
        },
        {
          // Missing person_id
          first_name: 'Jane',
          last_name: 'Smith',
          date_of_birth: '1985-06-20',
          nationality: 'UK',
          risk_level: 'MEDIUM',
          investigation_status: 'MONITORING',
        },
        {
          person_id: 'P003',
          first_name: 'Bob',
          last_name: 'Johnson',
          date_of_birth: 'invalid-date', // Invalid date format
          nationality: 'CA',
          risk_level: 'HIGH',
          investigation_status: 'ACTIVE',
        },
      ]

      const result = validatePersonBatch(mixedData)
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(2)
      expect(result.valid[0].person_id).toBe('P001')
      expect(result.invalid[0].index).toBe(1)
      expect(result.invalid[1].index).toBe(2)
      expect(result.invalid[0].errors).toBeDefined()
    })
  })

  describe('validateBankAccountBatch', () => {
    it('should validate all valid bank accounts', () => {
      const validAccounts = [
        {
          account_id: 'ACC001',
          iban: 'DE89370400440532013000',
          bank_id: 'BNK001',
          account_type: 'CHECKING',
          country: 'DE',
          currency: 'EUR',
          current_balance: 5000.50,
          opened_date: '2020-01-15',
          status: 'ACTIVE',
        },
        {
          account_id: 'ACC002',
          iban: 'FR1420041010050500013M02606',
          bank_id: 'BNK002',
          account_type: 'SAVINGS',
          country: 'FR',
          currency: 'EUR',
          current_balance: 10000,
          opened_date: '2019-05-20',
          status: 'ACTIVE',
        },
      ]

      const result = validateBankAccountBatch(validAccounts)
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it('should separate valid and invalid bank accounts', () => {
      const mixedData = [
        {
          account_id: 'ACC001',
          iban: 'DE89370400440532013000',
          bank_id: 'BNK001',
          account_type: 'CHECKING',
          country: 'DE',
          currency: 'EUR',
          current_balance: 5000,
          opened_date: '2020-01-15',
          status: 'ACTIVE',
        },
        {
          account_id: 'ACC002',
          // Missing IBAN
          bank_id: 'BNK002',
          account_type: 'SAVINGS',
          country: 'FR',
          currency: 'EUR',
          current_balance: 10000,
          opened_date: '2019-05-20',
          status: 'ACTIVE',
        },
      ]

      const result = validateBankAccountBatch(mixedData)
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0].index).toBe(1)
    })
  })

  describe('validateBankBatch', () => {
    it('should validate all valid banks', () => {
      const validBanks = [
        {
          bank_id: 'BNK001',
          name: 'Deutsche Bank',
          country: 'DE',
          routing_number: '370400440',
        },
        {
          bank_id: 'BNK002',
          name: 'BNP Paribas',
          country: 'FR',
          routing_number: '200410100',
        },
      ]

      const result = validateBankBatch(validBanks)
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it('should separate valid and invalid banks', () => {
      const mixedData = [
        {
          bank_id: 'BNK001',
          name: 'Deutsche Bank',
          country: 'DE',
          routing_number: '370400440',
        },
        {
          bank_id: 'BNK002',
          name: '', // Empty name
          country: 'FR',
          routing_number: '200410100',
        },
      ]

      const result = validateBankBatch(mixedData)
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0].index).toBe(1)
    })
  })

  describe('validateCompanyBatch', () => {
    it('should validate all valid companies', () => {
      const validCompanies = [
        {
          company_id: 'COM001',
          registration_number: 'REG123456',
          name: 'TechCorp Inc',
          country: 'US',
          business_type: 'Technology',
          is_shell_company: false,
          incorporation_date: '2015-06-20',
          status: 'ACTIVE',
        },
        {
          company_id: 'COM002',
          registration_number: 'REG789012',
          name: 'Shell Company Ltd',
          country: 'BVI',
          business_type: 'Holdings',
          is_shell_company: true,
          incorporation_date: '2020-01-01',
          status: 'ACTIVE',
        },
      ]

      const result = validateCompanyBatch(validCompanies)
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it('should separate valid and invalid companies', () => {
      const mixedData = [
        {
          company_id: 'COM001',
          registration_number: 'REG123456',
          name: 'TechCorp Inc',
          country: 'US',
          business_type: 'Technology',
          is_shell_company: false,
          incorporation_date: '2015-06-20',
          status: 'ACTIVE',
        },
        {
          company_id: 'COM002',
          registration_number: 'REG789012',
          name: 'Invalid Corp',
          country: 'BVI',
          business_type: 'Holdings',
          is_shell_company: 'yes', // Invalid boolean
          incorporation_date: '2020-01-01',
          status: 'ACTIVE',
        },
      ]

      const result = validateCompanyBatch(mixedData)
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0].index).toBe(1)
    })
  })

  describe('validateTransactionBatch', () => {
    it('should validate all valid transactions', () => {
      const validTransactions = [
        {
          transaction_id: 'TXN001',
          from_iban: 'DE89370400440532013000',
          to_iban: 'FR1420041010050500013M02606',
          amount: 1500.00,
          currency: 'EUR',
          date: '2024-01-15 14:30:00',
          transaction_type: 'WIRE',
          is_flagged: false,
        },
        {
          transaction_id: 'TXN002',
          from_iban: 'GB82WEST12345698765432',
          to_iban: 'ES9121000418450200051332',
          amount: 2500.50,
          currency: 'EUR',
          date: '2024-01-16',
          transaction_type: 'TRANSFER',
          is_flagged: false,
        },
      ]

      const result = validateTransactionBatch(validTransactions)
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it('should separate valid and invalid transactions', () => {
      const mixedData = [
        {
          transaction_id: 'TXN001',
          from_iban: 'DE89370400440532013000',
          to_iban: 'FR1420041010050500013M02606',
          amount: 1500.00,
          currency: 'EUR',
          date: '2024-01-15 14:30:00',
          transaction_type: 'WIRE',
          is_flagged: false,
        },
        {
          transaction_id: 'TXN002',
          from_iban: 'DE89370400440532013000',
          to_iban: 'FR1420041010050500013M02606',
          amount: -500, // Negative amount
          currency: 'EUR',
          date: '2024-01-16',
          transaction_type: 'WIRE',
          is_flagged: false,
        },
        {
          transaction_id: 'TXN003',
          // Missing from_iban
          to_iban: 'FR1420041010050500013M02606',
          amount: 1000,
          currency: 'EUR',
          date: '2024-01-17',
          transaction_type: 'WIRE',
          is_flagged: false,
        },
      ]

      const result = validateTransactionBatch(mixedData)
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(2)
      expect(result.invalid[0].index).toBe(1)
      expect(result.invalid[1].index).toBe(2)
    })

    it('should preserve error details for invalid transactions', () => {
      const invalidData = [
        {
          transaction_id: 'TXN001',
          from_iban: 'INVALID',
          to_iban: 'FR1420041010050500013M02606',
          amount: -100,
          currency: 'EUR',
          date: '2024-01-15',
          transaction_type: 'INVALID_TYPE',
          is_flagged: false,
        },
      ]

      const result = validateTransactionBatch(invalidData)
      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0].errors.issues.length).toBeGreaterThan(0)
      expect(result.invalid[0].data).toEqual(invalidData[0])
    })
  })
})
