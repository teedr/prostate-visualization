import { useCallback, useMemo, useState } from 'react'
import {
  ExternalLink,
  FileSearch,
  Microscope,
  ShieldCheck,
} from 'lucide-react'
import './AppV2.css'
import biopsyProcessComic from './assets/biopsy-process-comic-v6.jpg'
import prostateAnatomy from './assets/prostate-anatomy-v2.jpg'
import {
  ReportExplorer,
  type ReportView,
} from './components/ReportExplorer'
import { TermLabel } from './components/InfoTip'
import type { ExplanationKey } from './reportExplanations'
import { ReportLab } from './components/ReportLab'
import { CanaryHeader } from './components/CanaryHeader'
import type { BiopsySite, ParseResult } from './reportParser'
import { parseReport } from './reportParser'
import {
  buildReportSummary,
  formatGleason,
  getDominantSite,
  isSchematicSite,
  type BiopsyRoute,
  type FeatureEvidence,
  type ReportSummary,
} from './reportSummary'
import { sampleReport } from './sampleReport'

const feedbackUrl = `https://github.com/teedr/prostate-visualization/issues/new?title=${encodeURIComponent(
  'Simplified prototype feedback',
)}&body=${encodeURIComponent(
  [
    'What was easy to understand?',
    '',
    'What still felt busy or unclear?',
    '',
    'Which report detail should be easier to find?',
    '',
    'Please do not include names, dates of birth, MRNs, or real report text.',
  ].join('\n'),
)}`

const processSteps = [
  {
    number: '1',
    title: 'Check the PSA',
    copy: 'A higher or rising result does not mean cancer. Repeat testing, an exam, or MRI may come before biopsy.',
  },
  {
    number: '2',
    title: 'Take small tissue cores',
    copy: 'An ultrasound-guided hollow needle removes slender samples from specific areas.',
  },
  {
    number: '3',
    title: 'Keep samples separate',
    copy: 'Each core stays tied to its source label so the location can follow the tissue.',
  },
  {
    number: '4',
    title: 'Examine the slide',
    copy: 'A pathologist studies the stained tissue and reports grade, amount, and other features.',
  },
] as const

function AppV2() {
  const [reportText, setReportText] = useState(sampleReport)
  const [fileName, setFileName] = useState(
    'fictional-prostate-biopsy-demo.txt',
  )
  const [reportLabOpen, setReportLabOpen] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>()
  const [reportView, setReportView] = useState<ReportView>('three')

  const parsed = useMemo(() => parseReport(reportText), [reportText])
  const summary = useMemo(
    () => buildReportSummary(parsed.sites, parsed.sourceText),
    [parsed.sites, parsed.sourceText],
  )
  const requestedSite = parsed.sites.find((site) => site.id === selectedSiteId)
  const highestSchematicSite = useMemo(
    () => getDominantSite(parsed.sites.filter(isSchematicSite)),
    [parsed.sites],
  )
  const activeSelectedSiteId =
    reportView === 'three'
      ? requestedSite && isSchematicSite(requestedSite)
        ? requestedSite.id
        : highestSchematicSite?.id ?? requestedSite?.id ?? summary.highestSite?.id
      : requestedSite?.id ?? summary.highestSite?.id ?? parsed.sites[0]?.id
  const isDemo = reportText === sampleReport

  const closeReportLab = useCallback(() => setReportLabOpen(false), [])

  function changeReportText(text: string) {
    setReportText(text)
    setSelectedSiteId(undefined)
  }

  function loadSample() {
    setReportText(sampleReport)
    setFileName('fictional-prostate-biopsy-demo.txt')
    setSelectedSiteId(undefined)
    setReportView('three')
  }

  function resetReport() {
    setReportText('')
    setFileName('')
    setSelectedSiteId(undefined)
    setReportView('three')
  }

  return (
    <div className="simple-app">
      <CanaryHeader inactive={reportLabOpen} />

      <main
        id="main-content"
        tabIndex={-1}
        inert={reportLabOpen ? true : undefined}
        aria-hidden={reportLabOpen || undefined}
      >
        <ProcessComic />

        <section className="results-section" id="results" aria-labelledby="results-title">
          <div className="results-heading">
            <div>
              <span className="section-label">Report walkthrough</span>
              <h2 id="results-title">Your biopsy results</h2>
            </div>
            <div className="results-heading-actions">
              <span className="report-kind">
                {isDemo ? 'Fictional demo' : 'Current report text'}
              </span>
              <button type="button" className="use-report-button" onClick={() => setReportLabOpen(true)}>
                <FileSearch aria-hidden="true" size={17} />
                Use a report
              </button>
            </div>
          </div>

          <div className="compact-safety" role="note">
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>Educational parser—verify against the original report.</strong>{' '}
              This summarizes wording; it does not diagnose, stage, assign a risk
              group, or recommend treatment.
            </p>
          </div>

          <SpecimenResults
            parsed={parsed}
            summary={summary}
            selectedSiteId={activeSelectedSiteId}
            onSelectSite={setSelectedSiteId}
            reportView={reportView}
            onChangeReportView={setReportView}
          />
        </section>
      </main>

      <footer
        className="simple-footer"
        inert={reportLabOpen ? true : undefined}
        aria-hidden={reportLabOpen || undefined}
      >
        <div>
          <Microscope aria-hidden="true" />
          <span>Processed locally in this browser · Not medical advice</span>
        </div>
        <a href={feedbackUrl} target="_blank" rel="noreferrer">
          Send feedback
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      </footer>

      <ReportLab
        open={reportLabOpen}
        reportText={reportText}
        fileName={fileName}
        parsed={parsed}
        onChangeReportText={changeReportText}
        onChangeFileName={setFileName}
        onLoadSample={loadSample}
        onReset={resetReport}
        onClose={closeReportLab}
      />
    </div>
  )
}

function ProcessComic() {
  return (
    <section className="process-section" id="process" aria-labelledby="process-title">
      <div className="process-heading">
        <span className="section-label">Basic anatomy</span>
        <h1 id="process-title">Where the prostate is</h1>
        <p>
          The prostate is a small gland just below the bladder and in front of
          the rectum. It surrounds the urethra and makes some of the fluid in
          semen.
        </p>
      </div>

      <figure className="anatomy-intro">
        <div className="anatomy-illustration">
          <img
            src={prostateAnatomy}
            alt="Side-view illustration showing the bladder above the prostate, the urethra passing through it, and the rectum behind it"
          />
          <span className="anatomy-callout" aria-hidden="true">Prostate</span>
        </div>
      </figure>

      <div className="process-heading process-flow-heading">
        <span className="section-label">From PSA to pathology</span>
        <h2>How a PSA check can lead to a biopsy report</h2>
        <p>
          PSA is measured with a blood test. A higher or rising result does not
          mean cancer; repeat testing, an exam, or MRI may come first.
        </p>
      </div>

      <figure className="process-comic">
        <img
          src={biopsyProcessComic}
          alt="Four-panel medical comic showing a capped blood vial beside a trend graph with one elevated result, a core-biopsy needle, separated tissue samples, and a pathologist examining a stained slide"
        />
        <figcaption>
          {processSteps.map((step) => (
            <div key={step.number}>
              <span>{step.number}</span>
              <p>
                <strong>{step.title}</strong>
                {step.copy}
              </p>
            </div>
          ))}
        </figcaption>
      </figure>

      <p className="process-context">
        If those checks still raise concern, a biopsy collects tiny tissue samples
        so a pathologist can determine whether cancer is present and, if so,
        describe it.
      </p>
      <div className="process-sources" aria-label="Patient education sources">
        <span>Patient guides</span>
        <a
          href="https://www.niddk.nih.gov/health-information/urologic-diseases/prostate-problems"
          target="_blank"
          rel="noreferrer"
        >
          Prostate anatomy
          <ExternalLink aria-hidden="true" size={13} />
        </a>
        <a
          href="https://www.cancer.gov/types/prostate/psa-fact-sheet"
          target="_blank"
          rel="noreferrer"
        >
          PSA testing
          <ExternalLink aria-hidden="true" size={13} />
        </a>
      </div>
    </section>
  )
}

function SpecimenResults({
  parsed,
  summary,
  selectedSiteId,
  onSelectSite,
  reportView,
  onChangeReportView,
}: {
  parsed: ParseResult
  summary: ReportSummary
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
  reportView: ReportView
  onChangeReportView: (view: ReportView) => void
}) {
  return (
    <div className="results-layout results-layout-specimen">
      <div className="layout-panel-heading specimen-layout-heading">
        <span className="layout-panel-label">Specimen navigator</span>
        <h3>Explore each tissue sample</h3>
        <p>
          Choose a specimen to see its result. Tap an <span className="inline-info">i</span> for
          a plain-language explanation of what you’re reading.
        </p>
      </div>
      <ReportExplorer
        sites={parsed.sites}
        selectedSiteId={selectedSiteId}
        onSelectSite={onSelectSite}
        activeView={reportView}
        onChangeView={onChangeReportView}
      />
      <section className="specimen-report-snapshot" aria-labelledby="specimen-snapshot-title">
        <div className="layout-panel-heading">
          <span className="layout-panel-label">Report-level context</span>
          <h3 id="specimen-snapshot-title">Whole-report snapshot</h3>
        </div>
        <ResultsSummary parsed={parsed} summary={summary} />
      </section>
      <ImportantDetails parsed={parsed} summary={summary} />
      <DecisionLimits />
      <p className="results-education-source">
        Learn more: <a href="https://www.cancer.org/cancer/diagnosis-staging/tests/pathology-reports/prostate-pathology/prostate-cancer-pathology.html" target="_blank" rel="noreferrer">American Cancer Society’s guide to your pathology report</a>
      </p>
    </div>
  )
}

function ResultsSummary({
  parsed,
  summary,
}: {
  parsed: ParseResult
  summary: ReportSummary
}) {
  const cancerSites = parsed.sites.filter((site) => site.status === 'malignant')
  const coreCountCoverage = cancerSites.filter(
    (site) => site.coresPositive !== undefined,
  ).length
  const maxInvolvementSite = getMaxInvolvementSite(cancerSites)

  return (
    <div className="results-summary">
      <p className="results-sentence">{summarySentence(summary)}</p>
      <div className="metric-grid">
        <Metric
          label="Highest grade"
          explanation="highestGrade"
          value={summary.highestGradeGroup ? `GG${summary.highestGradeGroup}` : 'Not found'}
          detail={
            summary.highestSite
              ? `${formatGleason(summary.highestSite)} · ${summary.highestSite.sourceLabel}`
              : 'No cancer grade was parsed from this text.'
          }
        />
        <Metric
          label="Cancer-bearing specimen groups"
          explanation="specimenGroups"
          value={`${summary.cancerSiteCount} of ${summary.parsedSiteCount}`}
          detail="Specimen groups with cancer wording—not a stage or tumor count."
        />
        <Metric
          label="Known positive cores"
          explanation="positiveCores"
          value={
            summary.knownPositiveCores === undefined
              ? 'Not found'
              : String(summary.knownPositiveCores)
          }
          detail={
            cancerSites.length > 0
              ? `Documented in ${coreCountCoverage} of ${cancerSites.length} cancer-bearing specimen groups.`
              : 'No cancer-bearing specimen group was parsed.'
          }
        />
        <Metric
          label="Greatest reported involvement"
          explanation="involvement"
          value={
            summary.maxInvolvement === undefined
              ? 'Not found'
              : `${summary.maxInvolvement}%`
          }
          detail={
            maxInvolvementSite
              ? `${maxInvolvementSite.sourceLabel} · describes a sample, not whole-prostate volume.`
              : 'No involvement percentage was found in the parsed cancer specimens.'
          }
        />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  explanation,
}: {
  label: string
  value: string
  detail: string
  explanation: ExplanationKey
}) {
  return (
    <article className="metric-card">
      <span><TermLabel label={label} term={explanation} /></span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function ImportantDetails({
  parsed,
  summary,
}: {
  parsed: ParseResult
  summary: ReportSummary
}) {
  const relevantPatternFourSites = parsed.sites.filter(
    (site) =>
      site.status === 'malignant' &&
      (site.gradeGroup === 2 || site.gradeGroup === 3),
  )
  const reportedPatternFour = relevantPatternFourSites.filter(
    (site) => site.pattern4Percent !== undefined,
  )
  const patternFourMaximum = reportedPatternFour.reduce<number | undefined>(
    (maximum, site) =>
      maximum === undefined
        ? site.pattern4Percent
        : Math.max(maximum, site.pattern4Percent ?? maximum),
    undefined,
  )

  return (
    <section className="important-details" aria-labelledby="details-title">
      <div className="detail-section-heading">
        <div>
          <span className="section-label">Important report details</span>
          <h3 id="details-title">Present, negative, and unmentioned are different</h3>
        </div>
        <span className="route-note">Biopsy route: {routeLabel(summary.route)}</span>
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <span><TermLabel label="Pattern 4 amount" term="pattern4" /></span>
          <strong>
            {patternFourMaximum === undefined
              ? 'Not found in relevant text'
              : `${patternFourMaximum}% reported`}
          </strong>
          <p>
            {relevantPatternFourSites.length === 0
              ? 'No GG2 or GG3 cancer-bearing specimen was parsed.'
              : `${reportedPatternFour.length} of ${relevantPatternFourSites.length} GG2/GG3 specimen groups reported a value.`}
          </p>
        </article>
        <FeatureCoverageCard term="cribriform" title="Cribriform morphology" evidence={summary.cribriform} />
        <FeatureCoverageCard term="intraductal" title="Intraductal carcinoma (IDC-P)" evidence={summary.intraductal} />
      </div>

      <details className="secondary-detail">
        <summary>Other report detail: perineural invasion</summary>
        <p><TermLabel label="Perineural invasion" term="pni" /></p>
        <p>{featureCoverageCopy(summary.perineuralInvasion)}</p>
      </details>
    </section>
  )
}

function FeatureCoverageCard({
  title,
  evidence,
  term,
}: {
  title: string
  term: ExplanationKey
  evidence: FeatureEvidence
}) {
  return (
    <article className={`detail-card ${featureTone(evidence)}`}>
      <span><TermLabel label={title} term={term} /></span>
      <strong>{featureHeadline(evidence)}</strong>
      <p>{featureCoverageCopy(evidence)}</p>
    </article>
  )
}

function DecisionLimits() {
  return (
    <details className="decision-limits">
      <summary>What this report cannot decide by itself</summary>
      <div>
        <p>
          Pathology is one part of the picture. PSA, clinical stage, imaging,
          health context, and clinician review are also needed before assigning
          a risk group or discussing treatment.
        </p>
        <h4>Questions for the next visit</h4>
        <ol>
          <li>What are my official Grade Group, clinical stage, and risk group?</li>
          <li>Were pattern 4, cribriform morphology, and IDC-P evaluated where relevant?</li>
          <li>Which source labels or report details should we verify together?</li>
        </ol>
        <div className="source-links">
          <a
            href="https://www.cancer.gov/types/prostate/patient/prostate-treatment-pdq"
            target="_blank"
            rel="noreferrer"
          >
            NCI patient guide
            <ExternalLink aria-hidden="true" size={14} />
          </a>
          <a
            href="https://www.nccn.org/patients/guidelines/content/PDF/prostate-early-patient.pdf"
            target="_blank"
            rel="noreferrer"
          >
            NCCN Guidelines for Patients
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        </div>
      </div>
    </details>
  )
}

function getMaxInvolvementSite(sites: BiopsySite[]) {
  let maximum: BiopsySite | undefined

  for (const site of sites) {
    if (
      site.involvementPercent !== undefined &&
      (maximum?.involvementPercent === undefined ||
        site.involvementPercent > maximum.involvementPercent)
    ) {
      maximum = site
    }
  }

  return maximum
}


function summarySentence(summary: ReportSummary) {
  if (!summary.highestSite || !summary.highestGradeGroup) {
    return summary.parsedSiteCount > 0
      ? `The prototype parsed ${summary.parsedSiteCount} specimen groups and did not find a cancer Grade Group.`
      : 'Add report text to begin the walkthrough.'
  }

  return `The highest parsed finding is Grade Group ${summary.highestGradeGroup} (${formatGleason(summary.highestSite)}) in ${summary.highestSite.sourceLabel}.`
}

function featureHeadline(evidence: FeatureEvidence) {
  if (evidence.presentCount > 0) {
    return evidence.reviewedCount > evidence.presentCount
      ? `Reported present in ${evidence.presentCount} of ${evidence.reviewedCount}`
      : 'Reported present'
  }
  if (evidence.negativeCount > 0) {
    return evidence.unstatedCount > 0
      ? `Not identified in ${evidence.negativeCount} of ${evidence.reviewedCount}`
      : 'Reported not identified'
  }
  return 'Not found in report text'
}

function featureCoverageCopy(evidence: FeatureEvidence) {
  if (evidence.reviewedCount === 0) {
    return 'No cancer-bearing specimen group was available for this check.'
  }

  return `${evidence.presentCount} present · ${evidence.negativeCount} reported not identified · ${evidence.unstatedCount} not stated, across ${evidence.reviewedCount} cancer-bearing specimen groups.`
}

function featureTone(evidence: FeatureEvidence) {
  if (evidence.presentCount > 0) {
    return 'is-present'
  }
  if (evidence.negativeCount > 0) {
    return 'is-negative'
  }
  return 'is-unstated'
}

function routeLabel(route: BiopsyRoute) {
  if (route === 'transperineal') {
    return 'Transperineal'
  }
  if (route === 'transrectal') {
    return 'Transrectal'
  }
  if (route === 'both') {
    return 'Both routes mentioned'
  }
  return 'Not found in report text'
}

export default AppV2
