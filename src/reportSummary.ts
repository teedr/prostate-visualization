import {
  gradeGroupFromGleason,
  type BiopsySite,
  type BiopsyStatus,
} from './reportParser.ts'

export type BiopsyRoute =
  | 'transperineal'
  | 'transrectal'
  | 'both'
  | 'not-reported'

export type FeatureKey =
  | 'cribriform'
  | 'intraductal'
  | 'perineuralInvasion'

export type FeatureEvidence = {
  state: 'present' | 'reported-negative' | 'not-found'
  presentCount: number
  negativeCount: number
  unstatedCount: number
  reviewedCount: number
}

export type ReportSummary = {
  cancerSiteCount: number
  parsedSiteCount: number
  highestSite?: BiopsySite
  highestGradeGroup?: number
  maxInvolvement?: number
  knownPositiveCores?: number
  knownTotalCores?: number
  coreDenominatorComplete: boolean
  cancerSides: Array<'left' | 'right'>
  route: BiopsyRoute
  cribriform: FeatureEvidence
  intraductal: FeatureEvidence
  perineuralInvasion: FeatureEvidence
}

export function buildReportSummary(
  sites: BiopsySite[],
  sourceText = '',
): ReportSummary {
  const cancerSites = sites.filter((site) => site.status === 'malignant')
  const highestSite = getDominantSite(cancerSites)
  const involvementValues = cancerSites
    .map((site) => site.involvementPercent)
    .filter((value): value is number => value !== undefined)
  const knownPositive = cancerSites
    .map((site) => site.coresPositive)
    .filter((value): value is number => value !== undefined)
  const knownTotals = sites
    .map((site) => site.coresTotal)
    .filter((value): value is number => value !== undefined)
  const cancerSides = Array.from(
    new Set(
      cancerSites
        .map((site) => site.side)
        .filter((side): side is 'left' | 'right' => side !== undefined),
    ),
  )

  return {
    cancerSiteCount: cancerSites.length,
    parsedSiteCount: sites.length,
    highestSite,
    highestGradeGroup: highestSite?.gradeGroup,
    maxInvolvement:
      involvementValues.length > 0 ? Math.max(...involvementValues) : undefined,
    knownPositiveCores:
      knownPositive.length > 0
        ? knownPositive.reduce((total, value) => total + value, 0)
        : undefined,
    knownTotalCores:
      knownTotals.length > 0
        ? knownTotals.reduce((total, value) => total + value, 0)
        : undefined,
    coreDenominatorComplete:
      sites.length > 0 &&
      sites.every((site) => site.coresTotal !== undefined),
    cancerSides,
    route: detectBiopsyRoute(sourceText),
    cribriform: getFeatureEvidence(cancerSites, 'cribriform'),
    intraductal: getFeatureEvidence(cancerSites, 'intraductal'),
    perineuralInvasion: getFeatureEvidence(
      cancerSites,
      'perineuralInvasion',
    ),
  }
}

export function detectBiopsyRoute(text: string): BiopsyRoute {
  const normalized = text.toLowerCase()
  const hasTransperineal =
    /\btrans[\s-]?perineal\b/.test(normalized) ||
    /\bthrough\s+the\s+perine(?:um|al\s+skin)\b/.test(normalized)
  const hasTransrectal =
    /\btrans[\s-]?rectal\b/.test(normalized) ||
    /\bthrough\s+the\s+rect(?:um|al\s+wall)\b/.test(normalized)

  if (hasTransperineal && hasTransrectal) {
    return 'both'
  }

  if (hasTransperineal) {
    return 'transperineal'
  }

  if (hasTransrectal) {
    return 'transrectal'
  }

  return 'not-reported'
}

export function getFeatureEvidence(
  cancerSites: BiopsySite[],
  key: FeatureKey,
): FeatureEvidence {
  const values = cancerSites.map((site) => site[key])
  const presentCount = values.filter((value) => value === true).length
  const negativeCount = values.filter((value) => value === false).length
  const unstatedCount = values.filter((value) => value === undefined).length

  return {
    state:
      presentCount > 0
        ? 'present'
        : negativeCount > 0
          ? 'reported-negative'
          : 'not-found',
    presentCount,
    negativeCount,
    unstatedCount,
    reviewedCount: values.length,
  }
}

export function getDominantSite(sites: BiopsySite[]) {
  let dominant: BiopsySite | undefined

  for (const site of sites) {
    if (!dominant || compareSitePriority(site, dominant) > 0) {
      dominant = site
    }
  }

  return dominant
}

export function isSchematicSite(site: BiopsySite) {
  return Boolean(
    !site.isTargeted && site.side && site.region && site.track,
  )
}

function compareSitePriority(left: BiopsySite, right: BiopsySite) {
  const leftRank = sitePriority(left)
  const rightRank = sitePriority(right)

  for (let index = 0; index < leftRank.length; index += 1) {
    const difference = leftRank[index] - rightRank[index]
    if (difference !== 0) {
      return difference
    }
  }

  return 0
}

function sitePriority(site: BiopsySite) {
  const gleasonScore =
    site.gleasonScore ??
    (site.gleasonPrimary !== undefined && site.gleasonSecondary !== undefined
      ? site.gleasonPrimary + site.gleasonSecondary
      : 0)
  const gradeGroup =
    site.gradeGroup ??
    gradeGroupFromGleason(
      site.gleasonPrimary,
      site.gleasonSecondary,
      gleasonScore || undefined,
    ) ??
    0

  return [
    statusPriority(site.status),
    gradeGroup,
    gleasonScore,
    site.gleasonPrimary ?? 0,
    site.gleasonSecondary ?? 0,
    site.involvementPercent ?? -1,
  ]
}

function statusPriority(status: BiopsyStatus) {
  if (status === 'malignant') {
    return 4
  }

  if (status === 'suspicious') {
    return 3
  }

  if (status === 'unknown') {
    return 2
  }

  return 1
}

export function statusClass(site: BiopsySite) {
  if (site.status === 'malignant' && site.gradeGroup) {
    return `grade-group-${site.gradeGroup}`
  }

  return site.status
}

export function formatGleason(site?: BiopsySite) {
  if (
    site?.gleasonPrimary !== undefined &&
    site.gleasonSecondary !== undefined &&
    site.gleasonScore !== undefined
  ) {
    return `${site.gleasonPrimary}+${site.gleasonSecondary}=${site.gleasonScore}`
  }

  return 'Not found'
}

export function formatCores(site: BiopsySite) {
  if (site.coresPositive !== undefined && site.coresTotal !== undefined) {
    return `${site.coresPositive} of ${site.coresTotal}`
  }

  if (site.coresPositive !== undefined) {
    return `${site.coresPositive} positive; total not found`
  }

  return 'Not found'
}

export function formatPercent(value?: number) {
  return value === undefined ? 'Not found' : `${value}%`
}

export function formatPresence(value?: boolean) {
  if (value === undefined) {
    return 'Not found in text'
  }

  return value ? 'Reported present' : 'Reported not identified'
}

export function statusLabel(site: BiopsySite) {
  if (site.status === 'malignant') {
    return 'Cancer wording'
  }

  if (site.status === 'suspicious') {
    return 'Atypical / PIN'
  }

  if (site.status === 'benign') {
    return 'Benign wording'
  }

  return 'Needs review'
}
