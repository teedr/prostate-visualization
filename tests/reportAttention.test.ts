import assert from 'node:assert/strict'
import test from 'node:test'
import { parseReport } from '../src/reportParser.ts'
import { highestReportedGrade, isHighestReportedGrade, reportedFeatureFlags, specimenMarkerColor, specimenTone } from '../src/reportAttention.ts'

function specimen(diagnosis: string) {
  const site = parseReport(`A. Prostate, left lateral apex, needle biopsy:\n${diagnosis}`).sites[0]
  assert.ok(site)
  return site
}

test('all cancer grades and ungraded cancer get red sample markers', () => {
  const cancer = specimen('Adenocarcinoma, Gleason score 3+4=7 (Grade Group 2).')
  for (const gradeGroup of [1, 2, 3, 4, 5, undefined]) {
    assert.equal(specimenMarkerColor({ ...cancer, gradeGroup }), 0xc73545)
  }
})

test('sample marker colors distinguish affirmative concern, atypical, benign, and unknown', () => {
  const benign = specimen('Benign prostatic tissue.')
  assert.equal(specimenMarkerColor({ ...benign, cribriform: true }), 0xc73545)
  assert.equal(specimenMarkerColor({ ...benign, intraductal: true }), 0xc73545)
  assert.equal(specimenMarkerColor({ ...benign, status: 'suspicious' }), 0xe2b444)
  assert.equal(specimenMarkerColor({ ...benign, cribriform: false }), 0x8bab9f)
  assert.equal(specimenMarkerColor({ ...benign, status: 'unknown' }), 0x9aa7b1)
})

test('uncertain cancer wording is amber rather than a cancer flag', () => {
  const site = specimen('Atypical glands suspicious for but not diagnostic of adenocarcinoma.')
  assert.equal(specimenTone(site), 'atypical')
  assert.deepEqual(reportedFeatureFlags(site), [])
})

test('negative and missing features do not become concern flags', () => {
  const site = specimen('Benign prostatic tissue. Cribriform morphology: not identified. Intraductal carcinoma: not identified.')
  assert.equal(specimenTone(site), 'benign')
  assert.deepEqual(reportedFeatureFlags(site), [])
  assert.deepEqual(reportedFeatureFlags({ ...site, cribriform: undefined, intraductal: undefined }), [])
})

test('affirmative additional features remain visible even without a cancer status', () => {
  const site = specimen('Benign prostatic tissue.')
  const flagged = { ...site, intraductal: true, perineuralInvasion: true }
  assert.equal(specimenTone(flagged), 'concern')
  assert.deepEqual(reportedFeatureFlags(flagged), ['IDC-P present', 'Perineural invasion present'])
})

test('highest grade marks ties and never marks missing grades or uncertain samples', () => {
  const cancer = specimen('Adenocarcinoma, Gleason score 3+4=7 (Grade Group 2).')
  const high = { ...cancer, gradeGroup: 4 }
  const uncertain = { ...cancer, gradeGroup: 5, status: 'suspicious' as const }
  const highest = highestReportedGrade([cancer, high, { ...high, id: 'second' }, uncertain])
  assert.equal(highest, 4)
  assert.equal(isHighestReportedGrade(high, highest), true)
  assert.equal(isHighestReportedGrade({ ...high, id: 'second' }, highest), true)
  assert.equal(isHighestReportedGrade(uncertain, highest), false)
  assert.equal(highestReportedGrade([{ ...cancer, gradeGroup: undefined }]), undefined)
  assert.equal(isHighestReportedGrade({ ...cancer, gradeGroup: undefined }, undefined), false)
})
