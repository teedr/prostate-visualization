export type IdentifierMatch = {
  kind: string
  match: string
  index: number
}

type IdentifierPattern = {
  kind: string
  expression: RegExp
}

const patterns: IdentifierPattern[] = [
  {
    kind: 'Labeled name',
    expression:
      /\b(?:patient\s+name|patient|name)\s*[:#-]\s*[^\n,;]{2,60}/gi,
  },
  {
    kind: 'Medical record number',
    expression:
      /\b(?:mrn|medical\s+record(?:\s+number)?|patient\s+id)\s*[:#-]?\s*[a-z0-9-]{4,30}\b/gi,
  },
  {
    kind: 'Date of birth',
    expression:
      /\b(?:dob|date\s+of\s+birth)\s*[:#-]?\s*(?:\d{1,2}[/-]){2}\d{2,4}\b/gi,
  },
  {
    kind: 'Email address',
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: 'Phone number',
    expression:
      /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g,
  },
  {
    kind: 'Social Security number',
    expression: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
]

export function findPotentialIdentifiers(text: string): IdentifierMatch[] {
  const matches: IdentifierMatch[] = []

  for (const pattern of patterns) {
    pattern.expression.lastIndex = 0
    for (const match of text.matchAll(pattern.expression)) {
      matches.push({
        kind: pattern.kind,
        match: match[0],
        index: match.index,
      })
    }
  }

  return matches.toSorted((a, b) => a.index - b.index)
}

export function scrubPotentialIdentifiers(text: string) {
  let scrubbed = text
  const counts = new Map<string, number>()

  for (const pattern of patterns) {
    pattern.expression.lastIndex = 0
    scrubbed = scrubbed.replace(pattern.expression, () => {
      const nextCount = (counts.get(pattern.kind) ?? 0) + 1
      counts.set(pattern.kind, nextCount)
      return `[REMOVED: ${pattern.kind.toUpperCase()}]`
    })
  }

  return {
    text: scrubbed,
    removedCount: Array.from(counts.values()).reduce(
      (total, value) => total + value,
      0,
    ),
    counts,
  }
}
