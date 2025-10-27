/**
 * Foreign Key Detector for CSV/XLSX Data
 *
 * Detects foreign keys based on column name patterns and data characteristics.
 * Supports confidence scoring and custom pattern matching.
 */

/**
 * Type of pattern that matched during foreign key detection
 */
export type PatternType =
  | 'domain_specific'
  | 'iban'
  | 'suffix_id'
  | 'suffix_id_camel'
  | 'reference'
  | 'custom'

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
  patternType: PatternType
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
  /** Optional function to derive entity name from the column name */
  extractEntity?: (columnName: string) => string
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
 * Built-in pattern detection rules for common foreign key patterns.
 *
 * Each rule consists of:
 * - pattern: Regular expression to match column names
 * - confidence: Score from 0.0 to 1.0 indicating match quality
 * - targetEntity: Optional entity this FK references
 * - patternType: Classification of the pattern (domain_specific, iban, suffix_id, etc.)
 * - extractEntity: Optional function to derive entity name from column name
 */
interface PatternRule {
  /** Regular expression to match column names */
  pattern: RegExp
  /** Confidence score (0.0 - 1.0) for this pattern */
  confidence: number
  /** Target entity this foreign key references (optional) */
  targetEntity?: string
  /** Type/category of this pattern */
  patternType: PatternType
  /** Function to extract entity name from column name (optional) */
  extractEntity?: (columnName: string) => string
}

/**
 * Confidence level constants for pattern matching.
 * These define standard confidence scores used throughout the detector.
 */
const CONFIDENCE = {
  /** Very high confidence - exact domain-specific patterns */
  VERY_HIGH: 0.95,
  /** High confidence - strong indicators like *_id, *_iban patterns */
  HIGH: 0.90,
  /** Medium-high confidence - camelCase variants of strong patterns */
  MEDIUM_HIGH: 0.80,
  /** Medium confidence - camelCase ID patterns */
  MEDIUM: 0.75,
  /** Low confidence - weak indicators like 'ref' or 'reference' */
  LOW: 0.50,
} as const

/**
 * Converts snake_case identifier to PascalCase entity name.
 * Examples: 'bank_account' -> 'BankAccount', 'user_profile' -> 'UserProfile'
 *
 * @param snakeCaseId - Snake case identifier (e.g., 'bank_account_id')
 * @returns PascalCase entity name
 */
function snakeCaseToPascalCase(snakeCaseId: string): string {
  return snakeCaseId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/**
 * Capitalizes the first letter of a string.
 * Examples: 'person' -> 'Person', 'bankAccount' -> 'BankAccount'
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Default foreign key detection patterns for banking domain.
 *
 * Patterns are ordered by specificity (most specific first).
 * When multiple patterns match a column, the highest confidence wins.
 */
const DEFAULT_PATTERNS: PatternRule[] = [
  // Domain-specific patterns (VERY_HIGH confidence)
  {
    pattern: /^bank_id$/i,
    confidence: CONFIDENCE.VERY_HIGH,
    targetEntity: 'Bank',
    patternType: 'domain_specific',
  },
  {
    pattern: /^person_id$/i,
    confidence: CONFIDENCE.VERY_HIGH,
    targetEntity: 'Person',
    patternType: 'domain_specific',
  },
  {
    pattern: /^company_id$/i,
    confidence: CONFIDENCE.VERY_HIGH,
    targetEntity: 'Company',
    patternType: 'domain_specific',
  },
  {
    pattern: /^account_id$/i,
    confidence: CONFIDENCE.VERY_HIGH,
    targetEntity: 'BankAccount',
    patternType: 'domain_specific',
  },
  {
    pattern: /^transaction_id$/i,
    confidence: CONFIDENCE.VERY_HIGH,
    targetEntity: 'Transaction',
    patternType: 'domain_specific',
  },
  {
    pattern: /^parent_id$/i,
    confidence: CONFIDENCE.HIGH,
    targetEntity: 'Person',
    patternType: 'domain_specific',
  },

  // IBAN patterns - snake_case (HIGH confidence)
  {
    pattern: /^from_iban$/i,
    confidence: CONFIDENCE.HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /^to_iban$/i,
    confidence: CONFIDENCE.HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /.*_iban$/i,
    confidence: CONFIDENCE.HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },

  // IBAN patterns - camelCase (MEDIUM_HIGH confidence)
  {
    pattern: /^fromIban$/,
    confidence: CONFIDENCE.MEDIUM_HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /^toIban$/,
    confidence: CONFIDENCE.MEDIUM_HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },
  {
    pattern: /.*Iban$/,
    confidence: CONFIDENCE.MEDIUM_HIGH,
    targetEntity: 'BankAccount',
    patternType: 'iban',
  },

  // Generic *_id patterns - snake_case (HIGH confidence)
  {
    pattern: /^(\w+)_id$/i,
    confidence: CONFIDENCE.HIGH,
    patternType: 'suffix_id',
    extractEntity: (columnName: string) => {
      const match = columnName.match(/^(\w+)_id$/i)!
      return snakeCaseToPascalCase(match[1])
    },
  },

  // Generic *Id patterns - camelCase (MEDIUM confidence)
  {
    pattern: /^(\w+)Id$/,
    confidence: CONFIDENCE.MEDIUM,
    patternType: 'suffix_id_camel',
    extractEntity: (columnName: string) => {
      const match = columnName.match(/^(\w+)Id$/)!
      return capitalizeFirst(match[1])
    },
  },

  // Reference patterns (LOW confidence)
  {
    pattern: /.*_?ref(?:_|erence)?.*$/i,
    confidence: CONFIDENCE.LOW,
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
  const { customPatterns = [], minConfidence = 0.0, caseInsensitive = true } = options

  // Combine built-in and custom patterns
  const allPatterns: PatternRule[] = [
    ...DEFAULT_PATTERNS,
    ...customPatterns.map(cp => ({
      pattern: cp.pattern,
      confidence: cp.confidence,
      targetEntity: cp.targetEntity,
      patternType: 'custom' as const,
      extractEntity: cp.extractEntity,
    }))
  ].map(rule => {
    // Adjust regex flags based on caseInsensitive option
    const hasIFlag = rule.pattern.flags.includes('i')
    const needsAdjustment = (caseInsensitive && !hasIFlag) || (!caseInsensitive && hasIFlag)

    if (!needsAdjustment) {
      return rule
    }

    // Create new pattern with adjusted flags
    const newFlags = caseInsensitive
      ? rule.pattern.flags + 'i'
      : rule.pattern.flags.replace('i', '')
    const newPattern = new RegExp(rule.pattern.source, newFlags)

    // If there's an extractEntity function, create a new one that uses the adjusted pattern
    let newExtractEntity = rule.extractEntity

    if (rule.extractEntity) {
      // Check if this is one of the built-in extractEntity functions that needs updating
      const isSnakeCaseIdPattern = rule.pattern.source === '^(\\w+)_id$'
      const isCamelCaseIdPattern = rule.pattern.source === '^(\\w+)Id$'

      if (isSnakeCaseIdPattern) {
        newExtractEntity = (columnName: string) => {
          const match = columnName.match(newPattern)!
          return snakeCaseToPascalCase(match[1])
        }
      } else if (isCamelCaseIdPattern) {
        newExtractEntity = (columnName: string) => {
          const match = columnName.match(newPattern)!
          return capitalizeFirst(match[1])
        }
      }
    }

    return {
      ...rule,
      pattern: newPattern,
      extractEntity: newExtractEntity
    }
  })

  const detectedKeys: ForeignKey[] = []

  // Filter out empty/invalid headers
  const validHeaders = headers.filter((header) => header && header.trim().length > 0)

  for (const header of validHeaders) {
    // Collect all matching patterns for this column
    const matches: Array<{
      confidence: number
      targetEntity?: string
      patternType: PatternType
    }> = []

    // Test patterns against trimmed header for better CSV compatibility
    const trimmedHeader = header.trim()

    for (const rule of allPatterns) {
      if (rule.pattern.test(trimmedHeader)) {
        // Determine target entity
        let targetEntity = rule.targetEntity

        if (rule.extractEntity) {
          targetEntity = rule.extractEntity(trimmedHeader)
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
