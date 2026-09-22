import type { BiopsySite } from './reportParser.ts'

// Only affirmative parsed findings are flagged. Missing values and explicit
// negatives must never acquire a clinical concern highlight.
export function reportedFeatureFlags(site: BiopsySite): string[] {
  const flags: string[] = []
  if (site.cribriform === true) flags.push('Cribriform present')
  if (site.intraductal === true) flags.push('IDC-P present')
  if (site.perineuralInvasion === true) flags.push('Perineural invasion present')
  if (site.gleasonPrimary === 5 || site.gleasonSecondary === 5 || (site.pattern5Percent ?? 0) > 0) {
    flags.push('Pattern 5 present')
  }
  return flags
}

export function specimenTone(site: BiopsySite): 'concern' | 'atypical' | 'benign' | 'unknown' {
  if (site.status === 'malignant' || reportedFeatureFlags(site).length > 0) return 'concern'
  if (site.status === 'suspicious') return 'atypical'
  return site.status
}

// Spatial views use finding status, not a grade rainbow: every cancer finding
// remains red, including lower grades and samples with no reported grade.
export function specimenMarkerColor(site: BiopsySite): number {
  const colors = {
    concern: 0xc73545,
    atypical: 0xe2b444,
    benign: 0x8bab9f,
    unknown: 0x9aa7b1,
  }
  return colors[specimenTone(site)]
}

export function highestReportedGrade(sites: BiopsySite[]): number | undefined {
  const grades = sites.filter((site) => site.status === 'malignant')
    .flatMap((site) => site.gradeGroup === undefined ? [] : [site.gradeGroup])
  return grades.length > 0 ? Math.max(...grades) : undefined
}

export function isHighestReportedGrade(site: BiopsySite, highest?: number): boolean {
  return site.status === 'malignant' && highest !== undefined && site.gradeGroup === highest
}
