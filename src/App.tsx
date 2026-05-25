import {
  Suspense,
  lazy,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  Box,
  CircleHelp,
  ClipboardPaste,
  FileText,
  FlaskConical,
  Info,
  Map,
  MessageSquare,
  RotateCcw,
  Table2,
  Upload,
} from 'lucide-react'
import './App.css'
import {
  type BiopsyRegion,
  type BiopsySide,
  type BiopsySite,
  type BiopsyStatus,
  type BiopsyTrack,
  parseReport,
} from './reportParser'
import { sampleReport } from './sampleReport'

const Prostate3DView = lazy(() =>
  import('./Prostate3DView').then((module) => ({
    default: module.Prostate3DView,
  })),
)

type ActiveView = 'map' | 'three' | 'table' | 'raw'

const rows: BiopsyRegion[] = ['base', 'mid', 'apex']
const columns: Array<{
  side: BiopsySide
  track: BiopsyTrack
  label: string
}> = [
  { side: 'right', track: 'lateral', label: 'Right lateral' },
  { side: 'right', track: 'medial', label: 'Right medial' },
  { side: 'left', track: 'medial', label: 'Left medial' },
  { side: 'left', track: 'lateral', label: 'Left lateral' },
]

const statusLabels: Record<BiopsyStatus, string> = {
  benign: 'Benign',
  suspicious: 'Atypical / PIN',
  malignant: 'Cancer',
  unknown: 'Unclear',
}

type ExplanationKey =
  | 'highestGradeGroup'
  | 'positiveCores'
  | 'maxInvolvement'
  | 'flaggedFeatures'
  | 'gleasonScore'
  | 'gradeGroup'
  | 'cores'
  | 'involvement'
  | 'pattern4'
  | 'pattern5'
  | 'tumorLength'
  | 'pni'
  | 'cribriform'
  | 'intraductal'
  | 'benign'
  | 'suspicious'
  | 'cancer'
  | 'unclear'
  | 'targetedCores'
  | 'site'
  | 'patientSide'
  | 'baseMidApex'
  | 'lateralMedial'
  | 'confidence'
  | 'schematic3d'

type TooltipPlacement = 'top' | 'bottom'

const explanations: Record<
  ExplanationKey,
  { title: string; body: string }
> = {
  highestGradeGroup: {
    title: 'Highest Grade Group',
    body: 'The highest Grade Group found in the parsed samples. Grade Group 1 is usually the least aggressive-looking cancer under the microscope; Grade Group 5 is the most aggressive-looking. This is not the same as stage.',
  },
  positiveCores: {
    title: 'Positive cores',
    body: 'A core is one needle sample. Positive cores are samples where cancer was found. More positive cores can mean cancer was found in more sampled areas, but this number does not give the full stage by itself.',
  },
  maxInvolvement: {
    title: 'Max involvement',
    body: 'The largest percent of a single core that the report says was involved by cancer. It estimates how much of that small sample contained cancer.',
  },
  flaggedFeatures: {
    title: 'Flagged features',
    body: 'Extra findings that doctors may consider when judging risk, such as perineural invasion, cribriform pattern, or intraductal carcinoma.',
  },
  gleasonScore: {
    title: 'Gleason score',
    body: 'A microscope score for prostate cancer. The first number is the most common cancer pattern and the second is the next most common pattern. For example, 3+4=7 is different from 4+3=7.',
  },
  gradeGroup: {
    title: 'Grade Group',
    body: 'A newer 1 to 5 grouping based on the Gleason score. Lower numbers generally look less aggressive; higher numbers generally look more aggressive.',
  },
  cores: {
    title: 'Cores',
    body: 'Needle samples from that prostate area. 1/2 means cancer was found in one of two cores from that location.',
  },
  involvement: {
    title: 'Involvement',
    body: 'The percent of a biopsy core that contains cancer. This describes the small sampled piece of tissue, not the whole prostate.',
  },
  pattern4: {
    title: 'Pattern 4',
    body: 'In Gleason 7 cancer, pattern 4 usually looks more concerning than pattern 3. Reports sometimes list the percent of pattern 4.',
  },
  pattern5: {
    title: 'Pattern 5',
    body: 'Pattern 5 is the most abnormal Gleason pattern. If present, it is an important item to discuss with the treating clinician.',
  },
  tumorLength: {
    title: 'Tumor length',
    body: 'The measured length of cancer in a biopsy core, usually in millimeters. Some reports use this instead of, or in addition to, percent involvement.',
  },
  pni: {
    title: 'Perineural invasion',
    body: 'Cancer seen tracking along or around a nerve in the biopsy sample. It may matter to risk assessment, but it does not automatically mean cancer has spread.',
  },
  cribriform: {
    title: 'Cribriform pattern',
    body: 'A growth pattern where cancer forms sieve-like spaces. In prostate cancer reports it can be an adverse feature.',
  },
  intraductal: {
    title: 'Intraductal carcinoma',
    body: 'Cancer cells seen inside prostate ducts. It can be associated with more aggressive disease and should be reviewed with the clinician.',
  },
  benign: {
    title: 'Benign',
    body: 'No cancer was reported in that sample.',
  },
  suspicious: {
    title: 'Atypical / PIN',
    body: 'Abnormal cells were reported, such as HGPIN or ASAP. This is not the same as a definite cancer result in that core.',
  },
  cancer: {
    title: 'Cancer',
    body: 'Cancer was found in that sample. Look next at Grade Group, Gleason score, cores, and percent involvement to understand what the report says about that sample.',
  },
  unclear: {
    title: 'Unclear',
    body: 'The parser could not confidently classify this sample from the text it saw. Check the original report wording.',
  },
  targetedCores: {
    title: 'Targeted cores',
    body: 'Samples aimed at a specific MRI or ultrasound target, often called a lesion, ROI, or PI-RADS target. These are separate from the standard systematic samples.',
  },
  site: {
    title: 'Site',
    body: 'The prostate area where the sample came from. Reports often divide the prostate by left/right, base/mid/apex, and medial/lateral.',
  },
  patientSide: {
    title: 'Patient right / left',
    body: 'The sides are from the patient perspective. Patient right is the right side of the body, even if it appears on the left side of a diagram.',
  },
  baseMidApex: {
    title: 'Base / mid / apex',
    body: 'Base is the upper part of the prostate near the bladder, mid is the middle, and apex is the lower tip.',
  },
  lateralMedial: {
    title: 'Lateral / medial',
    body: 'Lateral means farther toward the outside edge. Medial means closer to the center line.',
  },
  confidence: {
    title: 'Parser confidence',
    body: 'A rough signal for how complete the parsed location and diagnosis looked. It is not medical confidence and should not replace the original report.',
  },
  schematic3d: {
    title: 'Schematic 3D view',
    body: 'The 3D view places report locations into approximate zones. It is not a patient-specific MRI model unless coordinates are added later.',
  },
}

const glossaryTerms: ExplanationKey[] = [
  'gleasonScore',
  'gradeGroup',
  'cores',
  'involvement',
  'pni',
  'cribriform',
  'intraductal',
  'targetedCores',
  'patientSide',
  'baseMidApex',
]

const feedbackUrl = `https://github.com/teedr/prostate-visualization/issues/new?title=${encodeURIComponent(
  'Prototype feedback',
)}&body=${encodeURIComponent(
  [
    'What confused you or did not work?',
    '',
    'What would make this easier for patients to understand?',
    '',
    'Please do not include names, dates of birth, MRNs, or full real pathology reports.',
  ].join('\n'),
)}`

function App() {
  const [reportText, setReportText] = useState('')
  const [fileName, setFileName] = useState('')
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('map')
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseReport(reportText), [reportText])
  const summary = useMemo(() => buildSummary(parsed.sites), [parsed.sites])
  const selectedSite =
    parsed.sites.find((site) => site.id === selectedSiteId) ??
    getDominantSite(parsed.sites) ??
    parsed.sites[0]

  async function handleFile(file: File) {
    setFileError('')
    setIsReadingFile(true)
    setFileName(file.name)

    try {
      const text =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          ? await extractPdfText(file)
          : await file.text()

      setReportText(text)
      setSelectedSiteId(undefined)
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : 'The report could not be read.',
      )
    } finally {
      setIsReadingFile(false)
    }
  }

  function loadSample() {
    setReportText(sampleReport)
    setFileName('sample-prostate-biopsy-report.txt')
    setSelectedSiteId(undefined)
    setFileError('')
  }

  function reset() {
    setReportText('')
    setFileName('')
    setSelectedSiteId(undefined)
    setFileError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-mark" aria-hidden="true">
          <FlaskConical size={22} />
        </div>
        <div>
          <h1>Prostate Biopsy Map</h1>
          <p>Needle biopsy report visualization</p>
        </div>
        <div className="top-actions">
          <a
            className="feedback-link"
            href={feedbackUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageSquare size={16} />
            Send feedback
          </a>
          <div className="safety-note">
            <Info size={16} />
            Clinician review required
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="input-panel" aria-label="Report input">
          <div className="panel-header">
            <div>
              <h2>Report</h2>
              <p>{fileName || 'PDF or text'}</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Reset report"
              title="Reset report"
              onClick={reset}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="upload-zone">
            <input
              ref={fileInputRef}
              id="report-upload"
              type="file"
              accept=".pdf,.txt,.text,application/pdf,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleFile(file)
                }
              }}
            />
            <label htmlFor="report-upload">
              <Upload size={19} />
              {isReadingFile ? 'Reading file' : 'Upload report'}
            </label>
            <button type="button" className="secondary-action" onClick={loadSample}>
              <FileText size={17} />
              Load sample
            </button>
          </div>

          {fileError && (
            <div className="inline-alert">
              <AlertTriangle size={16} />
              {fileError}
            </div>
          )}

          <label className="paste-label" htmlFor="report-text">
            <ClipboardPaste size={16} />
            Paste report text
          </label>
          <textarea
            id="report-text"
            value={reportText}
            onChange={(event) => {
              setReportText(event.target.value)
              setFileName('')
              setSelectedSiteId(undefined)
            }}
            spellCheck={false}
          />

          <div className="parser-notes">
            {parsed.warnings.length > 0 ? (
              parsed.warnings.map((warning) => (
                <div className="inline-alert" key={warning}>
                  <AlertTriangle size={16} />
                  {warning}
                </div>
              ))
            ) : (
              <div className="quiet-note">
                Parsed {parsed.sites.length} specimen
                {parsed.sites.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </aside>

        <section className="visual-panel" aria-label="Biopsy visualization">
          <div className="summary-grid">
            <Metric
              label="Highest grade group"
              value={summary.highestGradeGroup}
              explanationKey="highestGradeGroup"
            />
            <Metric
              label="Positive cores"
              value={summary.positiveCores}
              explanationKey="positiveCores"
            />
            <Metric
              label="Max involvement"
              value={summary.maxInvolvement}
              explanationKey="maxInvolvement"
            />
            <Metric
              label="Flagged features"
              value={summary.flaggedFeatures}
              explanationKey="flaggedFeatures"
            />
          </div>

          <PatientGuide
            sites={parsed.sites}
            selectedSite={selectedSite}
            summary={summary}
          />

          <div className="view-switch" aria-label="View">
            <button
              type="button"
              className={activeView === 'map' ? 'active' : ''}
              onClick={() => setActiveView('map')}
            >
              <Map size={17} />
              Map
            </button>
            <button
              type="button"
              className={activeView === 'three' ? 'active' : ''}
              onClick={() => setActiveView('three')}
            >
              <Box size={17} />
              3D
            </button>
            <button
              type="button"
              className={activeView === 'table' ? 'active' : ''}
              onClick={() => setActiveView('table')}
            >
              <Table2 size={17} />
              Table
            </button>
            <button
              type="button"
              className={activeView === 'raw' ? 'active' : ''}
              onClick={() => setActiveView('raw')}
            >
              <FileText size={17} />
              Raw
            </button>
          </div>

          {activeView === 'map' && (
            <div className="map-layout">
              <div>
                <div className="orientation-row">
                  <TermLabel label="Patient right" explanationKey="patientSide" />
                  <TermLabel label="Patient left" explanationKey="patientSide" />
                </div>
                <BiopsyMap
                  sites={parsed.sites}
                  selectedSiteId={selectedSite?.id}
                  onSelect={setSelectedSiteId}
                />
                <Legend />
              </div>

              <SiteDetails site={selectedSite} />
            </div>
          )}

          {activeView === 'three' && (
            <div className="map-layout three-layout">
              <div>
                <div className="view-note">
                  <TermLabel label="Schematic 3D view" explanationKey="schematic3d" />
                </div>
                <Suspense
                  fallback={
                    <div className="three-loading">Loading 3D view...</div>
                  }
                >
                  <Prostate3DView
                    sites={parsed.sites}
                    selectedSiteId={selectedSite?.id}
                    onSelect={setSelectedSiteId}
                  />
                </Suspense>
                <Legend />
              </div>

              <SiteDetails site={selectedSite} />
            </div>
          )}

          {activeView === 'table' && (
            <SiteTable sites={parsed.sites} onSelect={setSelectedSiteId} />
          )}

          {activeView === 'raw' && (
            <pre className="raw-output">
              {parsed.sites.length > 0
                ? JSON.stringify(parsed.sites, null, 2)
                : 'No parsed biopsy sites.'}
            </pre>
          )}

          <GlossaryPanel />
        </section>
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  explanationKey,
}: {
  label: string
  value: string
  explanationKey: ExplanationKey
}) {
  return (
    <div className="metric">
      <span className="metric-label">
        <TermLabel label={label} explanationKey={explanationKey} />
      </span>
      <strong>{value}</strong>
    </div>
  )
}

function PatientGuide({
  sites,
  selectedSite,
  summary,
}: {
  sites: BiopsySite[]
  selectedSite?: BiopsySite
  summary: ReturnType<typeof buildSummary>
}) {
  return (
    <section className="patient-guide" aria-label="Plain language summary">
      <div className="guide-heading">
        <Info size={17} />
        <div>
          <h2>Start here</h2>
          <p>{overallPlainLanguage(sites, summary)}</p>
        </div>
      </div>

      <div className="guide-grid">
        <div>
          <span>Selected sample</span>
          <p>{selectedSite ? selectedSitePlainLanguage(selectedSite) : 'Select a colored site to see what that specific biopsy sample says.'}</p>
        </div>
        <div>
          <span>Important limit</span>
          <p>
            This is a reading aid for the pathology text. It does not decide
            stage, risk group, or treatment.
          </p>
        </div>
      </div>
    </section>
  )
}

function TermLabel({
  label,
  explanationKey,
  tooltipPlacement = 'top',
}: {
  label: ReactNode
  explanationKey: ExplanationKey
  tooltipPlacement?: TooltipPlacement
}) {
  return (
    <span className="term-label">
      <span>{label}</span>
      <TermTip
        explanationKey={explanationKey}
        tooltipPlacement={tooltipPlacement}
      />
    </span>
  )
}

function TermTip({
  explanationKey,
  tooltipPlacement = 'top',
}: {
  explanationKey: ExplanationKey
  tooltipPlacement?: TooltipPlacement
}) {
  const explanation = explanations[explanationKey]

  return (
    <span className="term-tip-wrap" data-placement={tooltipPlacement}>
      <button
        type="button"
        className="term-tip"
        aria-label={`Explain ${explanation.title}`}
      >
        <CircleHelp size={13} />
      </button>
      <span className="term-tip-content" role="tooltip">
        <strong>{explanation.title}</strong>
        <span>{explanation.body}</span>
      </span>
    </span>
  )
}

function GlossaryPanel() {
  return (
    <details className="glossary-panel">
      <summary>Glossary: report terms</summary>
      <div className="glossary-grid">
        {glossaryTerms.map((term) => (
          <div key={term}>
            <strong>{explanations[term].title}</strong>
            <p>{explanations[term].body}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

function BiopsyMap({
  sites,
  selectedSiteId,
  onSelect,
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelect: (id: string) => void
}) {
  const systematicSites = sites.filter((site) => !site.isTargeted)
  const targetedSites = sites.filter((site) => site.isTargeted)
  const unmappedSites = systematicSites.filter((site) => !site.side || !site.region)

  return (
    <div className="biopsy-map">
      <div className="column-headings">
        {columns.map((column) => (
          <span key={`${column.side}-${column.track}`}>
            <TermLabel label={column.label} explanationKey="lateralMedial" />
          </span>
        ))}
      </div>

      <div className="gland-grid">
        <ProstateSilhouette />
        {rows.map((region) =>
          columns.map((column) => {
            const cellSites = systematicSites.filter(
              (site) =>
                site.side === column.side &&
                site.region === region &&
                (site.track === column.track ||
                  (!site.track && column.track === 'medial')),
            )
            const dominant = getDominantSite(cellSites)

            return (
              <button
                type="button"
                key={`${column.side}-${column.track}-${region}`}
                className={`map-cell ${dominant ? statusClass(dominant) : 'empty'} ${
                  cellSites.some((site) => site.id === selectedSiteId)
                    ? 'selected'
                    : ''
                }`}
                style={
                  dominant?.gradeGroup
                    ? ({
                        '--grade-level': dominant.gradeGroup,
                      } as CSSProperties)
                    : undefined
                }
                onClick={() => dominant && onSelect(dominant.id)}
                disabled={!dominant}
                aria-label={`${column.label} ${region}: ${
                  dominant ? formatSiteShort(dominant) : 'not parsed'
                }`}
                title={dominant ? formatSiteShort(dominant) : 'Not parsed'}
              >
                <span className="region-label">{toTitle(region)}</span>
                <strong>{dominant ? cellValue(dominant) : '-'}</strong>
                {dominant?.involvementPercent !== undefined && (
                  <small>{dominant.involvementPercent}%</small>
                )}
              </button>
            )
          }),
        )}
      </div>

      {targetedSites.length > 0 && (
        <div className="target-list">
          <h3>
            <TermLabel label="Targeted cores" explanationKey="targetedCores" />
          </h3>
          <GroupedSites
            sites={targetedSites}
            selectedSiteId={selectedSiteId}
            onSelect={onSelect}
          />
        </div>
      )}

      {unmappedSites.length > 0 && (
        <div className="target-list">
          <h3>Other parsed findings</h3>
          <GroupedSites
            sites={unmappedSites}
            selectedSiteId={selectedSiteId}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  )
}

function GroupedSites({
  sites,
  selectedSiteId,
  onSelect,
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelect: (id: string) => void
}) {
  if (sites.length === 0) {
    return null
  }

  return (
    <div className="site-pills">
      {sites.map((site) => (
        <button
          type="button"
          key={site.id}
          className={`site-pill ${statusClass(site)} ${
            site.id === selectedSiteId ? 'selected' : ''
          }`}
          onClick={() => onSelect(site.id)}
        >
          <span>{site.normalizedLabel}</span>
          <strong>{cellValue(site)}</strong>
        </button>
      ))}
    </div>
  )
}

function SiteDetails({ site }: { site?: BiopsySite }) {
  if (!site) {
    return (
      <aside className="details-panel">
        <h2>No site selected</h2>
        <p>Parsed biopsy findings appear here.</p>
      </aside>
    )
  }

  return (
    <aside className="details-panel">
      <div className="status-row">
        <span className={`status-dot ${statusClass(site)}`} />
        <TermLabel
          label={statusLabels[site.status]}
          explanationKey={statusExplanationKey(site.status)}
        />
        <span className="confidence">
          {site.confidence} confidence
          <TermTip explanationKey="confidence" />
        </span>
      </div>
      <h2>{site.normalizedLabel}</h2>
      <p>{site.diagnosis}</p>

      <dl className="detail-grid">
        <Detail
          label="Gleason"
          value={formatGleason(site)}
          explanationKey="gleasonScore"
        />
        <Detail
          label="Grade group"
          value={formatGradeGroup(site)}
          explanationKey="gradeGroup"
        />
        <Detail label="Cores" value={formatCores(site)} explanationKey="cores" />
        <Detail
          label="Involvement"
          value={formatPercent(site.involvementPercent)}
          explanationKey="involvement"
        />
        <Detail
          label="Pattern 4"
          value={formatPercent(site.pattern4Percent)}
          explanationKey="pattern4"
        />
        <Detail
          label="Pattern 5"
          value={formatPercent(site.pattern5Percent)}
          explanationKey="pattern5"
        />
        <Detail
          label="Tumor length"
          value={site.tumorMm ? `${site.tumorMm} mm` : '-'}
          explanationKey="tumorLength"
        />
        <Detail
          label="PNI"
          value={formatPresence(site.perineuralInvasion)}
          explanationKey="pni"
        />
        <Detail
          label="Cribriform"
          value={formatPresence(site.cribriform)}
          explanationKey="cribriform"
        />
        <Detail
          label="Intraductal"
          value={formatPresence(site.intraductal)}
          explanationKey="intraductal"
        />
      </dl>

      <details>
        <summary>Source text</summary>
        <pre>{site.raw}</pre>
      </details>
    </aside>
  )
}

function Detail({
  label,
  value,
  explanationKey,
}: {
  label: string
  value: string
  explanationKey?: ExplanationKey
}) {
  return (
    <div>
      <dt>
        {explanationKey ? (
          <TermLabel label={label} explanationKey={explanationKey} />
        ) : (
          label
        )}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}

function SiteTable({
  sites,
  onSelect,
}: {
  sites: BiopsySite[]
  onSelect: (id: string) => void
}) {
  if (sites.length === 0) {
    return <div className="empty-state">No parsed biopsy sites.</div>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <TermLabel
                label="Site"
                explanationKey="site"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Status"
                explanationKey="cancer"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Gleason"
                explanationKey="gleasonScore"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Grade group"
                explanationKey="gradeGroup"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Cores"
                explanationKey="cores"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Involvement"
                explanationKey="involvement"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="PNI"
                explanationKey="pni"
                tooltipPlacement="bottom"
              />
            </th>
            <th>
              <TermLabel
                label="Cribriform"
                explanationKey="cribriform"
                tooltipPlacement="bottom"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id} onClick={() => onSelect(site.id)}>
              <td>{site.normalizedLabel}</td>
              <td>
                <span className={`table-status ${statusClass(site)}`}>
                  {statusLabels[site.status]}
                </span>
              </td>
              <td>{formatGleason(site)}</td>
              <td>{formatGradeGroup(site)}</td>
              <td>{formatCores(site)}</td>
              <td>{formatPercent(site.involvementPercent)}</td>
              <td>{formatPresence(site.perineuralInvasion)}</td>
              <td>{formatPresence(site.cribriform)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Legend() {
  return (
    <div className="legend" aria-label="Legend">
      <LegendItem className="benign" label="Benign" explanationKey="benign" />
      <LegendItem
        className="suspicious"
        label="Atypical / PIN"
        explanationKey="suspicious"
      />
      {[1, 2, 3, 4, 5].map((grade) => (
        <LegendItem
          key={grade}
          className={`grade-${grade}`}
          label={`GG${grade}`}
          explanationKey="gradeGroup"
        />
      ))}
    </div>
  )
}

function LegendItem({
  className,
  label,
  explanationKey,
}: {
  className: string
  label: string
  explanationKey: ExplanationKey
}) {
  return (
    <span>
      <i className={`swatch ${className}`} />
      <TermLabel label={label} explanationKey={explanationKey} />
    </span>
  )
}

function ProstateSilhouette() {
  return (
    <svg
      className="prostate-silhouette"
      viewBox="0 0 420 300"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M210 18c-75 0-151 38-168 113-16 71 33 137 101 148 31 5 45-18 67-18s36 23 67 18c68-11 117-77 101-148C361 56 285 18 210 18Z" />
      <path d="M210 42c-39 42-49 81-47 126 1 37 17 64 47 86 30-22 46-49 47-86 2-45-8-84-47-126Z" />
    </svg>
  )
}

function buildSummary(sites: BiopsySite[]) {
  const malignantSites = sites.filter((site) => site.status === 'malignant')
  const highestGrade = Math.max(
    0,
    ...malignantSites.map((site) => site.gradeGroup ?? 0),
  )
  const positive = sumKnown(malignantSites.map((site) => site.coresPositive))
  const total = sumKnown(sites.map((site) => site.coresTotal))
  const maxInvolvement = Math.max(
    0,
    ...sites.map((site) => site.involvementPercent ?? 0),
  )
  const flags = [
    sites.some((site) => site.perineuralInvasion) ? 'PNI' : undefined,
    sites.some((site) => site.cribriform) ? 'Cribriform' : undefined,
    sites.some((site) => site.intraductal) ? 'IDC-P' : undefined,
  ].filter(Boolean)

  return {
    highestGradeGroup: highestGrade ? `GG${highestGrade}` : '-',
    positiveCores:
      positive !== undefined
        ? total !== undefined
          ? `${positive}/${total}`
          : String(positive)
        : '-',
    maxInvolvement: maxInvolvement ? `${maxInvolvement}%` : '-',
    flaggedFeatures: flags.length > 0 ? flags.join(', ') : '-',
  }
}

function overallPlainLanguage(
  sites: BiopsySite[],
  summary: ReturnType<typeof buildSummary>,
) {
  if (sites.length === 0) {
    return 'Upload or paste a report to turn the biopsy locations and pathology terms into a visual summary.'
  }

  const cancerSites = sites.filter((site) => site.status === 'malignant').length
  const suspiciousSites = sites.filter((site) => site.status === 'suspicious')
    .length

  if (cancerSites === 0) {
    return suspiciousSites > 0
      ? `The parser did not find definite cancer wording, but it found ${suspiciousSites} sample${suspiciousSites === 1 ? '' : 's'} with atypical or PIN-type wording.`
      : `The parser did not find definite cancer wording in the ${sites.length} parsed sample${sites.length === 1 ? '' : 's'}.`
  }

  const highestGrade =
    summary.highestGradeGroup !== '-'
      ? ` The highest parsed Grade Group is ${summary.highestGradeGroup}.`
      : ''
  const maxInvolvement =
    summary.maxInvolvement !== '-'
      ? ` The largest parsed core involvement is ${summary.maxInvolvement}.`
      : ''

  return `Cancer wording was found in ${cancerSites} of ${sites.length} parsed sample locations.${highestGrade}${maxInvolvement}`
}

function selectedSitePlainLanguage(site: BiopsySite) {
  if (site.status === 'benign') {
    return 'This selected sample was parsed as benign, meaning the report text did not describe cancer in this core.'
  }

  if (site.status === 'suspicious') {
    return 'This selected sample contains atypical or PIN-type wording. That is abnormal, but it is not the same as a definite cancer result in this sample.'
  }

  if (site.status === 'malignant') {
    const grade =
      site.gradeGroup !== undefined
        ? ` It is ${formatGradeGroup(site)}, where higher Grade Groups generally look more aggressive.`
        : ''
    const cores = formatCores(site) !== '-' ? ` Cores: ${formatCores(site)}.` : ''
    const involvement =
      site.involvementPercent !== undefined
        ? ` The report says ${site.involvementPercent}% involvement for this sample.`
        : ''

    return `This selected sample was parsed as cancer.${grade}${cores}${involvement}`
  }

  return 'The parser could not clearly classify this selected sample. Compare this entry against the original report text.'
}

function statusExplanationKey(status: BiopsyStatus): ExplanationKey {
  if (status === 'benign') {
    return 'benign'
  }

  if (status === 'suspicious') {
    return 'suspicious'
  }

  if (status === 'malignant') {
    return 'cancer'
  }

  return 'unclear'
}

function sumKnown(values: Array<number | undefined>) {
  const known = values.filter((value): value is number => value !== undefined)
  if (known.length === 0) {
    return undefined
  }

  return known.reduce((sum, value) => sum + value, 0)
}

function getDominantSite(sites: BiopsySite[]) {
  if (sites.length === 0) {
    return undefined
  }

  return [...sites].sort((a, b) => siteSeverity(b) - siteSeverity(a))[0]
}

function siteSeverity(site: BiopsySite) {
  if (site.status === 'malignant') {
    return 100 + (site.gradeGroup ?? 0) * 10 + (site.involvementPercent ?? 0) / 10
  }

  if (site.status === 'suspicious') {
    return 50
  }

  if (site.status === 'unknown') {
    return 10
  }

  return 1
}

function statusClass(site: BiopsySite) {
  if (site.status === 'malignant' && site.gradeGroup) {
    return `grade-${site.gradeGroup}`
  }

  return site.status
}

function cellValue(site: BiopsySite) {
  if (site.status === 'malignant') {
    return site.gradeGroup ? `GG${site.gradeGroup}` : 'CA'
  }

  if (site.status === 'suspicious') {
    return 'PIN'
  }

  if (site.status === 'benign') {
    return 'B'
  }

  return '?'
}

function formatSiteShort(site: BiopsySite) {
  const parts = [
    statusLabels[site.status],
    formatGradeGroup(site) !== '-' ? formatGradeGroup(site) : undefined,
    formatPercent(site.involvementPercent) !== '-'
      ? formatPercent(site.involvementPercent)
      : undefined,
  ].filter(Boolean)

  return parts.join(', ')
}

function formatGleason(site: BiopsySite) {
  if (site.gleasonPrimary && site.gleasonSecondary && site.gleasonScore) {
    return `${site.gleasonPrimary}+${site.gleasonSecondary}=${site.gleasonScore}`
  }

  return '-'
}

function formatGradeGroup(site: BiopsySite) {
  return site.gradeGroup ? `GG${site.gradeGroup}` : '-'
}

function formatCores(site: BiopsySite) {
  if (site.coresPositive !== undefined && site.coresTotal !== undefined) {
    return `${site.coresPositive}/${site.coresTotal}`
  }

  if (site.coresPositive !== undefined) {
    return `${site.coresPositive} positive`
  }

  return '-'
}

function formatPercent(value?: number) {
  return value !== undefined ? `${value}%` : '-'
}

function formatPresence(value?: boolean) {
  if (value === undefined) {
    return '-'
  }

  return value ? 'Present' : 'Not identified'
}

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

async function extractPdfText(file: File) {
  const [{ GlobalWorkerOptions, getDocument }, pdfWorker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ])

  GlobalWorkerOptions.workerSrc = pdfWorker.default

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n\n')
}

export default App
