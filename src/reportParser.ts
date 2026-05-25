export type BiopsyStatus = 'benign' | 'suspicious' | 'malignant' | 'unknown'

export type BiopsySide = 'left' | 'right'
export type BiopsyRegion = 'base' | 'mid' | 'apex'
export type BiopsyTrack = 'lateral' | 'medial'

export type BiopsySite = {
  id: string
  sourceLabel: string
  normalizedLabel: string
  side?: BiopsySide
  region?: BiopsyRegion
  track?: BiopsyTrack
  isTargeted: boolean
  targetNumber?: number
  status: BiopsyStatus
  diagnosis: string
  gradeGroup?: number
  gleasonPrimary?: number
  gleasonSecondary?: number
  gleasonScore?: number
  coresPositive?: number
  coresTotal?: number
  involvementPercent?: number
  tumorMm?: number
  pattern4Percent?: number
  pattern5Percent?: number
  perineuralInvasion?: boolean
  cribriform?: boolean
  intraductal?: boolean
  confidence: 'high' | 'medium' | 'low'
  raw: string
}

export type ParseResult = {
  sites: BiopsySite[]
  warnings: string[]
  extractedAt: string
  sourceText: string
}

type ReportBlock = {
  label: string
  body: string
}

const locationWords =
  /\b(left|right|base|mid|middle|apex|apical|lateral|medial|target|targeted|lesion|roi|region of interest|pirads|pi-rads)\b/i

const diagnosisWords =
  /\b(adenocarcinoma|carcinoma|gleason|grade group|benign|asap|atypical|h(?:igh)?\s*grade\s*pin|h?gpin|prostatic intraepithelial|involv(?:e|es|ed|ing)|perineural|cribriform|intraductal)\b/i

const specimenPrefix =
  /^(?:specimen\s*)?(?:part\s*)?([a-z]|\d{1,2})\s*[).:-]\s*/i

export function parseReport(text: string): ParseResult {
  const normalized = normalizeReportText(text)
  const blocks = findReportBlocks(normalized)
  const warnings: string[] = []

  if (normalized.trim().length === 0) {
    return {
      sites: [],
      warnings: ['No report text found.'],
      extractedAt: new Date().toISOString(),
      sourceText: '',
    }
  }

  if (blocks.length === 0) {
    warnings.push(
      'No specimen-level sections were detected. Paste the final diagnosis text if the upload only contains scanned images.',
    )
  }

  const sourceBlocks =
    blocks.length > 0 ? blocks : findLocationSentences(normalized)

  const sites = sourceBlocks
    .map((block, index) => parseBlock(block, index))
    .filter((site) => hasUsefulSignal(site))

  if (sites.length === 0) {
    warnings.push(
      'No biopsy sites were parsed. This first version expects prostate needle biopsy text with site labels such as left apex, right lateral base, or target lesion.',
    )
  }

  const duplicateLabels = new Set<string>()
  const seenLabels = new Set<string>()
  for (const site of sites) {
    const key = `${site.side ?? 'unknown'}-${site.region ?? 'unknown'}-${site.track ?? 'general'}-${site.targetNumber ?? 'systematic'}`
    if (seenLabels.has(key)) {
      duplicateLabels.add(site.normalizedLabel)
    }
    seenLabels.add(key)
  }

  if (duplicateLabels.size > 0) {
    warnings.push(
      `Multiple entries mapped to the same zone: ${Array.from(duplicateLabels).join(', ')}.`,
    )
  }

  return {
    sites,
    warnings,
    extractedAt: new Date().toISOString(),
    sourceText: normalized,
  }
}

export function gradeGroupFromGleason(
  primary?: number,
  secondary?: number,
  score?: number,
): number | undefined {
  if (!score && primary && secondary) {
    score = primary + secondary
  }

  if (!score) {
    return undefined
  }

  if (score <= 6) {
    return 1
  }

  if (score === 7 && primary === 3 && secondary === 4) {
    return 2
  }

  if (score === 7 && primary === 4 && secondary === 3) {
    return 3
  }

  if (score === 7) {
    return 2
  }

  if (score === 8) {
    return 4
  }

  if (score >= 9) {
    return 5
  }

  return undefined
}

function normalizeReportText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function findReportBlocks(text: string): ReportBlock[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const blocks: ReportBlock[] = []
  let current: ReportBlock | undefined

  for (const line of lines) {
    const header = extractHeader(line)

    if (header) {
      if (current) {
        blocks.push(current)
      }

      current = {
        label: header.label,
        body: header.body,
      }
      continue
    }

    if (current) {
      current.body = `${current.body}\n${line}`.trim()
    }
  }

  if (current) {
    blocks.push(current)
  }

  return blocks.filter((block) => locationWords.test(block.label))
}

function extractHeader(line: string): ReportBlock | undefined {
  const withoutPrefix = line.replace(specimenPrefix, '').trim()
  const colonMatch = withoutPrefix.match(/^(.{3,130}?)(?::|\s+-\s+)(.*)$/)

  if (colonMatch) {
    const [, candidate, body] = colonMatch
    if (locationWords.test(candidate)) {
      return {
        label: cleanLabel(candidate),
        body: body.trim(),
      }
    }
  }

  const labeledSpecimen = line.match(
    /^(?:specimen\s*)?(?:part\s*)?([a-z]|\d{1,2})\s*[).:-]\s*(.+)$/i,
  )

  if (labeledSpecimen) {
    const candidate = labeledSpecimen[2].trim()
    if (locationWords.test(candidate) && !diagnosisWords.test(candidate)) {
      return {
        label: cleanLabel(candidate),
        body: '',
      }
    }
  }

  const uppercaseLocation =
    withoutPrefix === withoutPrefix.toUpperCase() &&
    withoutPrefix.length <= 120 &&
    locationWords.test(withoutPrefix) &&
    !diagnosisWords.test(withoutPrefix)

  if (uppercaseLocation) {
    return {
      label: cleanLabel(withoutPrefix),
      body: '',
    }
  }

  return undefined
}

function findLocationSentences(text: string): ReportBlock[] {
  return text
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((line) => line.trim())
    .filter((line) => locationWords.test(line) && diagnosisWords.test(line))
    .map((line, index) => {
      const split = line.match(/^(.{3,100}?)(?::|\s+-\s+)(.*)$/)
      if (split) {
        return {
          label: cleanLabel(split[1]),
          body: split[2],
        }
      }

      return {
        label: `Unstructured finding ${index + 1}`,
        body: line,
      }
    })
}

function parseBlock(block: ReportBlock, index: number): BiopsySite {
  const fullText = `${block.label}\n${block.body}`.trim()
  const label = cleanLabel(block.label)
  const location = parseLocation(label, fullText, index)
  const gleason = parseGleason(fullText)
  const gradeGroup =
    parseGradeGroup(fullText) ??
    gradeGroupFromGleason(gleason.primary, gleason.secondary, gleason.score)
  const cores = parseCores(fullText)
  const diagnosis = summarizeDiagnosis(block.body || fullText)
  const status = parseStatus(fullText, gradeGroup)
  const confidence = rateConfidence({
    label,
    diagnosis,
    status,
    gradeGroup,
    location,
  })

  return {
    id: `${location.id}-${index}`,
    sourceLabel: block.label,
    normalizedLabel: location.normalizedLabel,
    side: location.side,
    region: location.region,
    track: location.track,
    isTargeted: location.isTargeted,
    targetNumber: location.targetNumber,
    status,
    diagnosis,
    gradeGroup,
    gleasonPrimary: gleason.primary,
    gleasonSecondary: gleason.secondary,
    gleasonScore: gleason.score,
    coresPositive: cores.positive,
    coresTotal: cores.total,
    involvementPercent: parseInvolvementPercent(fullText),
    tumorMm: parseTumorMm(fullText),
    pattern4Percent: parsePatternPercent(fullText, 4),
    pattern5Percent: parsePatternPercent(fullText, 5),
    perineuralInvasion: parsePresence(fullText, /perineural\s+invasion/i),
    cribriform: parsePresence(fullText, /cribriform(?:\s+(?:morphology|pattern|glands?))?/i),
    intraductal: parsePresence(fullText, /intraductal\s+carcinoma/i),
    confidence,
    raw: fullText,
  }
}

function parseLocation(label: string, fullText: string, index: number) {
  const text = `${label} ${fullText}`.toLowerCase()
  const isTargeted =
    /\b(target|targeted|lesion|roi|region of interest|pirads|pi-rads)\b/.test(
      text,
    )
  const side = /\bright\b/.test(text)
    ? 'right'
    : /\bleft\b/.test(text)
      ? 'left'
      : undefined
  const region = /\bbase\b/.test(text)
    ? 'base'
    : /\b(mid|middle)\b/.test(text)
      ? 'mid'
      : /\b(apex|apical)\b/.test(text)
        ? 'apex'
        : undefined
  const track = /\b(lateral|lat)\b/.test(text)
    ? 'lateral'
    : /\b(medial|med)\b/.test(text)
      ? 'medial'
      : undefined
  const targetNumber =
    Number(text.match(/\b(?:target|lesion|roi)\s*#?\s*(\d{1,2})\b/)?.[1]) ||
    (isTargeted ? index + 1 : undefined)
  const normalizedLabel = [
    isTargeted ? `Target ${targetNumber ?? index + 1}` : undefined,
    side,
    track,
    region,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return {
    id:
      [
        isTargeted ? `target-${targetNumber ?? index + 1}` : 'systematic',
        side,
        region,
        track,
      ]
        .filter(Boolean)
        .join('-') || `unmapped-${index + 1}`,
    side: side as BiopsySide | undefined,
    region: region as BiopsyRegion | undefined,
    track: track as BiopsyTrack | undefined,
    isTargeted,
    targetNumber,
    normalizedLabel: normalizedLabel || label,
  }
}

function parseGleason(text: string) {
  const direct = text.match(
    /\b(?:gleason(?:\s+(?:score|grade))?\s*(?:score)?\s*[:=]?\s*)?([3-5])\s*\+\s*([3-5])\s*=\s*(6|7|8|9|10)\b/i,
  )

  if (!direct) {
    return {}
  }

  return {
    primary: Number(direct[1]),
    secondary: Number(direct[2]),
    score: Number(direct[3]),
  }
}

function parseGradeGroup(text: string) {
  const match = text.match(
    /\b(?:grade\s+group|prognostic\s+grade\s+group|isup(?:\/who)?\s+grade\s+group|who\/isup\s+grade\s+group)\s*(?:is|:|=)?\s*([1-5])(?:\s*\/\s*5)?\b/i,
  )

  return match ? Number(match[1]) : undefined
}

function parseCores(text: string) {
  const compact = text.replace(/\s+/g, ' ')
  const direct = compact.match(
    /\b(?:involving\s*)?(\d{1,2})\s*(?:of|out\s+of|\/)\s*(\d{1,2})\s*(?:submitted\s*)?(?:cores?|fragments?)\b/i,
  )

  if (direct) {
    return {
      positive: Number(direct[1]),
      total: Number(direct[2]),
    }
  }

  const positive = compact.match(
    /\b(?:number\s+(?:of\s+)?)?cores?\s+(?:positive|involved|with\s+(?:carcinoma|cancer))\s*[:=]?\s*(\d{1,2})\b/i,
  )
  const total = compact.match(
    /\b(?:number\s+(?:of\s+)?)?cores?\s+(?:submitted|examined|received|total)\s*[:=]?\s*(\d{1,2})\b/i,
  )
  const involvingOnly = compact.match(/\binvolving\s+(\d{1,2})\s+cores?\b/i)

  return {
    positive: positive
      ? Number(positive[1])
      : involvingOnly
        ? Number(involvingOnly[1])
        : undefined,
    total: total ? Number(total[1]) : undefined,
  }
}

function parseInvolvementPercent(text: string) {
  const candidates = [
    /\b(?:%|percent(?:age)?)\s*(?:of\s*)?(?:tissue|core|specimen)\s*involv(?:ed|ement)\s*[:=]?\s*(\d{1,3})\s*%?/i,
    /\b(?:greatest\s+)?(?:percentage|percent)\s+of\s+core\s+involvement(?:\s+by\s+(?:cancer|carcinoma))?\s*[:=]?\s*(\d{1,3})\s*%?/i,
    /\b(?:adenocarcinoma|carcinoma|cancer|tumou?r)\s+involv(?:es|ing|ed)?[^%\n]{0,70}?(\d{1,3})\s*%/i,
    /\binvolv(?:es|ing|ed)?[^%\n]{0,45}?(?:core|tissue|specimen)[^%\n]{0,30}?(\d{1,3})\s*%/i,
    /\binvolv(?:es|ing|ed)?\s+(?:approximately\s+|about\s+|~)?(\d{1,3})\s*%/i,
  ]

  return firstValidPercent(text, candidates)
}

function parsePatternPercent(text: string, pattern: 4 | 5) {
  const candidates = [
    new RegExp(
      `\\b(?:%|percent(?:age)?)\\s*(?:gleason\\s*)?pattern\\s*${pattern}\\s*[:=]?\\s*(\\d{1,3})\\s*%?`,
      'i',
    ),
    new RegExp(
      `\\b(?:gleason\\s*)?pattern\\s*${pattern}\\s*(?:is|:|=)?\\s*(\\d{1,3})\\s*%`,
      'i',
    ),
  ]

  return firstValidPercent(text, candidates)
}

function firstValidPercent(text: string, candidates: RegExp[]) {
  for (const candidate of candidates) {
    const match = text.match(candidate)
    if (!match) {
      continue
    }

    const value = Number(match[1])
    if (value >= 0 && value <= 100) {
      return value
    }
  }

  return undefined
}

function parseTumorMm(text: string) {
  const matches = Array.from(
    text.matchAll(
      /\b(\d{1,2}(?:\.\d+)?)\s*mm\b(?=[^.\n]{0,45}\b(?:tumou?r|carcinoma|cancer|linear|length|focus|involvement|extent)\b)/gi,
    ),
  ).map((match) => Number(match[1]))

  if (matches.length === 0) {
    return undefined
  }

  return Math.max(...matches)
}

function parsePresence(text: string, term: RegExp) {
  const match = text.match(term)
  if (!match || match.index === undefined) {
    return undefined
  }

  const windowStart = Math.max(0, match.index - 30)
  const windowEnd = Math.min(text.length, match.index + match[0].length + 60)
  const window = text.slice(windowStart, windowEnd).toLowerCase()

  if (/\b(not\s+identified|not\s+present|absent|negative|none|no\s+evidence)\b/.test(window)) {
    return false
  }

  if (/\b(present|identified|positive|seen|focal)\b/.test(window)) {
    return true
  }

  return undefined
}

function parseStatus(text: string, gradeGroup?: number): BiopsyStatus {
  const lower = text.toLowerCase()

  if (
    gradeGroup ||
    /\b(prostatic\s+)?(?:acinar\s+)?adenocarcinoma\b/.test(lower) ||
    /\bcarcinoma\b/.test(lower)
  ) {
    return 'malignant'
  }

  if (
    /\b(asap|atypical\s+small\s+acinar\s+proliferation|atypical|suspicious|h(?:igh)?\s*grade\s*pin|h?gpin|prostatic intraepithelial neoplasia)\b/i.test(
      text,
    )
  ) {
    return 'suspicious'
  }

  if (/\bbenign\b/i.test(text) || /\bno\s+(?:malignancy|carcinoma)\b/i.test(text)) {
    return 'benign'
  }

  return 'unknown'
}

function summarizeDiagnosis(text: string) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= 160) {
    return collapsed || 'No diagnosis text captured'
  }

  const firstSentence = collapsed.match(/^(.{40,180}?[.!?])\s/)?.[1]
  return firstSentence ?? `${collapsed.slice(0, 157)}...`
}

function cleanLabel(label: string) {
  return label
    .replace(/\b(prostate|needle|core|biops(?:y|ies)|specimen|container|jar)\b/gi, '')
    .replace(/[,:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasUsefulSignal(site: BiopsySite) {
  return (
    site.side ||
    site.region ||
    site.isTargeted ||
    site.status !== 'unknown' ||
    site.gradeGroup
  )
}

function rateConfidence(input: {
  label: string
  diagnosis: string
  status: BiopsyStatus
  gradeGroup?: number
  location: ReturnType<typeof parseLocation>
}): BiopsySite['confidence'] {
  let score = 0

  if (input.location.side || input.location.isTargeted) {
    score += 1
  }
  if (input.location.region || input.location.isTargeted) {
    score += 1
  }
  if (input.status !== 'unknown') {
    score += 1
  }
  if (input.status !== 'malignant' || input.gradeGroup) {
    score += 1
  }
  if (input.diagnosis !== 'No diagnosis text captured') {
    score += 1
  }

  if (score >= 4) {
    return 'high'
  }

  if (score >= 2) {
    return 'medium'
  }

  return 'low'
}
