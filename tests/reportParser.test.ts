import assert from 'node:assert/strict'
import test from 'node:test'
import { parseReport, type BiopsySite } from '../src/reportParser.ts'

function parseSingleSite(diagnosis: string): BiopsySite {
  const result = parseReport(`A. Prostate, right apex, needle biopsy:\n${diagnosis}`)

  assert.equal(result.sites.length, 1)
  return result.sites[0]
}

test('classifies "no carcinoma" as benign', () => {
  const site = parseSingleSite('No carcinoma is identified.')

  assert.equal(site.status, 'benign')
  assert.equal(site.sourceLabel, 'right apex')
})

test('classifies a trailing negated carcinoma mention as benign', () => {
  const site = parseSingleSite('Carcinoma not identified.')

  assert.equal(site.status, 'benign')
})

test('preserves an explicit benign diagnosis', () => {
  const site = parseSingleSite('Benign prostatic tissue.')

  assert.equal(site.status, 'benign')
})

test('preserves explicit adenocarcinoma with Grade Group and Gleason details', () => {
  const site = parseSingleSite(
    'Prostatic acinar adenocarcinoma, Gleason score 3+4=7 (Grade Group 2).',
  )

  assert.equal(site.status, 'malignant')
  assert.equal(site.gleasonPrimary, 3)
  assert.equal(site.gleasonSecondary, 4)
  assert.equal(site.gleasonScore, 7)
  assert.equal(site.gradeGroup, 2)
})

test('derives Grade Group from an explicit Gleason score', () => {
  const site = parseSingleSite(
    'Prostatic adenocarcinoma, Gleason score 4+3=7.',
  )

  assert.equal(site.status, 'malignant')
  assert.equal(site.gradeGroup, 3)
})

test('keeps a positive adenocarcinoma malignant when IDC-P is negated', () => {
  const site = parseSingleSite(
    'Prostatic adenocarcinoma, Gleason score 3+3=6. Intraductal carcinoma: not identified.',
  )

  assert.equal(site.status, 'malignant')
  assert.equal(site.intraductal, false)
})

test('keeps suspicious-for adenocarcinoma wording suspicious', () => {
  const site = parseSingleSite('Atypical glands suspicious for adenocarcinoma.')

  assert.equal(site.status, 'suspicious')
})

test('keeps not-diagnostic-of adenocarcinoma wording suspicious', () => {
  const site = parseSingleSite(
    'Atypical small acinar proliferation, suspicious for but not diagnostic of adenocarcinoma.',
  )

  assert.equal(site.status, 'suspicious')
})

test('parses cribriform and intraductal findings as tri-state values', () => {
  const present = parseSingleSite(
    'Prostatic adenocarcinoma, Gleason score 4+4=8. Cribriform morphology: present. Intraductal carcinoma: identified.',
  )
  const absent = parseSingleSite(
    'Benign prostatic tissue. Cribriform morphology: not identified. Intraductal carcinoma: not identified.',
  )
  const unreported = parseSingleSite('Benign prostatic tissue.')

  assert.equal(present.cribriform, true)
  assert.equal(present.intraductal, true)
  assert.equal(absent.status, 'benign')
  assert.equal(absent.cribriform, false)
  assert.equal(absent.intraductal, false)
  assert.equal(unreported.cribriform, undefined)
  assert.equal(unreported.intraductal, undefined)
})
