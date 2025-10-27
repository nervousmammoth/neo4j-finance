/**
 * Foreign Key Detector for CSV/XLSX Data
 *
 * Detects foreign keys based on column name patterns and data characteristics.
 * Supports confidence scoring and custom pattern matching.
 */

/**
 * Represents a detected foreign key relationship
 */
export interface ForeignKey {
  /** Name of the column containing the foreign key */
  columnName: string
  /** Confidence score (0.0 - 1.0) indicating likelihood this is a foreign key */
  confidence: number
  /** Target entity this foreign key references (e.g., 'Person', 'Bank') */
  targetEntity?: string
  /** Type of pattern that matched (e.g., 'suffix_id', 'iban', 'domain_specific') */
  patternType: string
}

/**
 * Custom pattern definition for FK detection
 */
export interface CustomPattern {
  /** Regex pattern to match column names */
  pattern: RegExp
  /** Confidence score to assign when this pattern matches */
  confidence: number
  /** Target entity name for this pattern */
  targetEntity?: string
}

/**
 * Options for configuring FK detection behavior
 */
export interface FKDetectorOptions {
  /** Custom patterns to supplement built-in detection rules */
  customPatterns?: CustomPattern[]
  /** Minimum confidence threshold (0.0 - 1.0) for including results */
  minConfidence?: number
  /** Whether to perform case-insensitive matching (default: true) */
  caseInsensitive?: boolean
}

/**
 * Built-in pattern detection rules for common foreign key patterns
 */
interface PatternRule {
  pattern: RegExp
  confidence: number
  targetEntity?: string
  patternType: string
  extractEntity?: (columnName: string) => string
}

/**
 * Default foreign key detection patterns for banking domain
 */
const DEFAULT_PATTERNS: PatternRule[] = [
  // Domain-specific patterns (HIGH confidence: 0.95)
  {
    pattern: /^bank_id$/i,
    confidence: 0.95,
    targetEntity: 'Bank',
    patternType: 'domain_specific',
  },
  {
    pattern: /^person_id$/i,
    confidence: 0.95,
    targetEntity: 'Person',
    patternType: 'domain_specific',
  },
  {
    pattern: /^company_id$/i,
    confidence: 0.95,
    targetEntity: 'Company',
    patternType: 'domain_specific',
  },
  {
    pattern: /^account_id$/i,
    confidence: 0.95,
    targetEntity: 'BankAccount',
    patternType: 'domain_specific',
  },
  {
    pattern: /^transaction_id$/i,
    confidence: 0.95,
    targetEntity: 'Transaction',
    patternType: 'domain_specific',
  },
  {
    pattern: /^parent_id$/i,
    confidence: 0.90,
    targetEntity: 'Person',
    patternType: 'domain_specific',
  },

  // IBAN patterns - snake_case (HIGH confidence: 0.90)
  {
    pattern: /^from_iban$/i,
    confidence: 0.90,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /^to_iban$/i,
    confidence: 0.90,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /.*_iban$/i,
    confidence: 0.90,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },

  // IBAN patterns - camelCase (MEDIUM-HIGH confidence: 0.80)
  {
    pattern: /^fromIban$/,
    confidence: 0.80,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /^toIban$/,
    confidence: 0.80,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /.*Iban$/,
    confidence: 0.80,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },

  // Generic *_id patterns - snake_case (HIGH confidence: 0.90)
  {
    pattern: /^(\w+)_id$/i,
    confidence: 0.90,
    patternType: 'suffix_id',
    extractEntity: (columnName: string) => {
      const match = columnName.match(/^(\w+)_id$/i)!
      // Convert snake_case to PascalCase
      return match[1]
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('')
    },
  },

  // Generic *Id patterns - camelCase (MEDIUM confidence: 0.75)
  {
    pattern: /^(\w+)Id$/,
    confidence: 0.75,
    patternType: 'suffix_id_camel',
    extractEntity: (columnName: string) => {
      const match = columnName.match(/^(\w+)Id$/)!
      // Capitalize first letter
      const entity = match[1]
      return entity.charAt(0).toUpperCase() + entity.slice(1)
    },
  },

  // Reference patterns (LOW confidence: 0.50)
  {
    pattern: /.*_?ref(?:_|erence)?.*$/i,
    confidence: 0.50,
    patternType: 'reference',
  },
]

/**
 * Detects foreign keys in a dataset based on column headers.
 *
 * Uses pattern matching and confidence scoring to identify columns that
 * likely represent foreign key relationships.
 *
 * @param headers - Array of column header names from CSV/XLSX
 * @param options - Optional configuration for detection behavior
 * @returns Array of detected foreign keys, sorted by confidence (descending)
 *
 * @example
 * ```typescript
 * const headers = ['person_id', 'name', 'bank_id', 'from_iban']
 * const foreignKeys = detectForeignKeys(headers)
 * // Returns: [
 * //   { columnName: 'person_id', confidence: 0.95, targetEntity: 'Person', ... },
 * //   { columnName: 'bank_id', confidence: 0.95, targetEntity: 'Bank', ... },
 * //   { columnName: 'from_iban', confidence: 0.90, targetEntity: 'BankAccount', ... }
 * // ]
 * ```
 */
export function detectForeignKeys(
  headers: string[],
  options: FKDetectorOptions = {}
): ForeignKey[] {
  const { customPatterns = [], minConfidence = 0.0 } = options

  // Combine built-in and custom patterns
  const allPatterns: PatternRule[] = [
    ...DEFAULT_PATTERNS,
    ...customPatterns.map(cp => ({
      pattern: cp.pattern,
      confidence: cp.confidence,
      targetEntity: cp.targetEntity,
      patternType: 'custom' as const,
    }))
  ]

  const detectedKeys: ForeignKey[] = []

  // Filter out empty/invalid headers
  const validHeaders = headers.filter((header) => header && header.trim().length > 0)

  for (const header of validHeaders) {
    // Collect all matching patterns for this column
    const matches: Array<{
      confidence: number
      targetEntity?: string
      patternType: string
    }> = []

    for (const rule of allPatterns) {
      if (rule.pattern.test(header)) {
        // Determine target entity
        let targetEntity = rule.targetEntity

        if (rule.extractEntity) {
          targetEntity = rule.extractEntity(header)
        }

        matches.push({
          confidence: rule.confidence,
          targetEntity,
          patternType: rule.patternType,
        })
      }
    }

    // If we found any matches, use the one with highest confidence
    if (matches.length > 0) {
      // Sort by confidence descending and take the best match
      matches.sort((a, b) => b.confidence - a.confidence)
      const bestMatch = matches[0]

      detectedKeys.push({
        columnName: header,
        confidence: bestMatch.confidence,
        targetEntity: bestMatch.targetEntity,
        patternType: bestMatch.patternType,
      })
    }
  }

  // Filter by minimum confidence threshold
  const filtered = detectedKeys.filter((fk) => fk.confidence >= minConfidence)

  // Sort by confidence (descending)
  return filtered.sort((a, b) => b.confidence - a.confidence)
}
