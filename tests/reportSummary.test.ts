import assert from 'node:assert/strict'
import test from 'node:test'
import { parseReport } from '../src/reportParser.ts'
import {
  buildReportSummary,
  getDominantSite,
  isSchematicSite,
} from '../src/reportSummary.ts'

function parseSummary(diagnoses: string[]) {
  const report = diagnoses
    .map(
      (diagnosis, index) =>
        `${String.fromCharCode(65 + index)}. Prostate, ${index === 0 ? 'right' : 'left'} apex, needle biopsy:\n${diagnosis}`,
    )
    .join('\n\n')
  const parsed = parseReport(report)

  assert.equal(parsed.sites.length, diagnoses.length)
  return buildReportSummary(parsed.sites, parsed.sourceText)
}

test('ranks Grade Group before core involvement', () => {
  const summary = parseSummary([
    'Prostatic adenocarcinoma, Gleason score 3+3=6 (Grade Group 1), involving 100%.',
    'Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2).',
  ])

  assert.equal(summary.highestGradeGroup, 2)
  assert.equal(summary.highestSite?.side, 'left')
})

test('uses involvement only after the Grade Group and Gleason grade tie', () => {
  const summary = parseSummary([
    'Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2), involving 15%.',
    'Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2), involving 80%.',
  ])

  assert.equal(summary.highestGradeGroup, 2)
  assert.equal(summary.highestSite?.side, 'left')
  assert.equal(summary.highestSite?.involvementPercent, 80)
})

test('falls back to Gleason grade before involvement when Grade Group is absent', () => {
  const report = parseReport(`A. Prostate, right apex, needle biopsy:
Prostatic adenocarcinoma, Gleason score 3+3=6, involving 100%.

B. Prostate, left apex, needle biopsy:
Prostatic adenocarcinoma, Gleason score 3+4=7.`)
  const sitesWithoutGradeGroup = report.sites.map((site) => ({
    ...site,
    gradeGroup: undefined,
  }))
  const highestSite = getDominantSite(sitesWithoutGradeGroup)

  assert.equal(highestSite?.side, 'left')
  assert.equal(highestSite?.gleasonScore, 7)
})

test('keeps present, reported-negative, and unstated feature coverage separate', () => {
  const summary = parseSummary([
    'Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2). Cribriform morphology: present.',
    'Prostatic adenocarcinoma, Gleason score 3+3=6 (Grade Group 1). Cribriform morphology: not identified.',
    'Prostatic adenocarcinoma, Gleason score 4+3=7 (Grade Group 3).',
  ])

  assert.equal(summary.cribriform.state, 'present')
  assert.equal(summary.cribriform.presentCount, 1)
  assert.equal(summary.cribriform.negativeCount, 1)
  assert.equal(summary.cribriform.unstatedCount, 1)
  assert.equal(summary.cribriform.reviewedCount, 3)
})

test('keeps targeted samples without coordinates out of the 3D default selection', () => {
  const parsed = parseReport(`A. Prostate, left lateral base, needle biopsy:
Prostatic adenocarcinoma, Gleason score 3+4=7 (Grade Group 2).

B. Prostate, Target lesion 1, left peripheral zone base/mid, MRI-targeted, needle biopsy:
Prostatic adenocarcinoma, Gleason score 4+4=8 (Grade Group 4).`)

  const reportHighest = getDominantSite(parsed.sites)
  const schematicHighest = getDominantSite(
    parsed.sites.filter(isSchematicSite),
  )

  assert.equal(reportHighest?.isTargeted, true)
  assert.equal(schematicHighest?.sourceLabel, 'left lateral base')
  assert.ok(schematicHighest)
  assert.equal(isSchematicSite(schematicHighest), true)
})
