import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  Box,
  Flag,
  CircleAlert,
  CircleCheck,
  CircleDot,
  List,
  Map as MapIcon,
  ScanSearch,
} from 'lucide-react'
import type {
  BiopsyRegion,
  BiopsySide,
  BiopsySite,
  BiopsyTrack,
} from '../reportParser'
import {
  formatCores,
  formatGleason,
  formatPercent,
  formatPresence,
  getDominantSite,
  isSchematicSite,
  statusClass,
} from '../reportSummary'
import { InfoTip, TermLabel } from './InfoTip'
import type { ExplanationKey } from '../reportExplanations'
import { highestReportedGrade, isHighestReportedGrade, reportedFeatureFlags, specimenTone } from '../reportAttention'

const Prostate3DView = lazy(() =>
  import('../Prostate3DView').then((module) => ({
    default: module.Prostate3DView,
  })),
)

export type ReportView = 'map' | 'three' | 'list'

type ReportExplorerProps = {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
  activeView: ReportView
  onChangeView: (view: ReportView) => void
}

const regions: BiopsyRegion[] = ['base', 'mid', 'apex']

const columns: Array<{
  side: BiopsySide
  track: BiopsyTrack
  label: string
  shortLabel: string
}> = [
  {
    side: 'right',
    track: 'lateral',
    label: 'Patient right · lateral',
    shortLabel: 'R lateral',
  },
  {
    side: 'right',
    track: 'medial',
    label: 'Patient right · medial',
    shortLabel: 'R medial',
  },
  {
    side: 'left',
    track: 'medial',
    label: 'Patient left · medial',
    shortLabel: 'L medial',
  },
  {
    side: 'left',
    track: 'lateral',
    label: 'Patient left · lateral',
    shortLabel: 'L lateral',
  },
]

const views: Array<{
  id: ReportView
  label: string
  icon: typeof MapIcon
}> = [
  { id: 'three', label: '3D', icon: Box },
  { id: 'list', label: 'Specimens', icon: List },
  { id: 'map', label: 'Map', icon: MapIcon },
]

export function ReportExplorer({
  sites,
  selectedSiteId,
  onSelectSite,
  activeView,
  onChangeView,
}: ReportExplorerProps) {
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const highestGrade = highestReportedGrade(sites)
  const flaggedSites = sites.filter((site) => ['concern', 'atypical'].includes(specimenTone(site)))
  const visibleSites = flaggedOnly ? flaggedSites : sites
  const selectedSite =
    sites.find((site) => site.id === selectedSiteId) ?? sites[0]

  function changeFilter(onlyFlagged: boolean) {
    setFlaggedOnly(onlyFlagged)
    if (onlyFlagged && !flaggedSites.some((site) => site.id === selectedSite?.id)) {
      const next = getDominantSite(flaggedSites)
      if (next) onSelectSite(next.id)
    }
  }

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentView: ReportView,
  ) {
    const currentIndex = views.findIndex((view) => view.id === currentView)
    let nextIndex: number | undefined

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % views.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + views.length) % views.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = views.length - 1
    }

    if (nextIndex === undefined) {
      return
    }

    event.preventDefault()
    const nextView = views[nextIndex]
    onChangeView(nextView.id)
    window.requestAnimationFrame(() => {
      document.getElementById(`report-view-tab-${nextView.id}`)?.focus()
    })
  }

  return (
    <div className="report-explorer">
      <div className="report-canvas">
        <div className="report-view-tabs" role="tablist" aria-label="Report views">
          {views.map((view) => {
            const Icon = view.icon
            return (
              <button
                id={`report-view-tab-${view.id}`}
                type="button"
                role="tab"
                aria-selected={activeView === view.id}
                aria-controls="report-view-panel"
                tabIndex={activeView === view.id ? 0 : -1}
                className={activeView === view.id ? 'is-active' : ''}
                key={view.id}
                onClick={() => onChangeView(view.id)}
                onKeyDown={(event) => handleTabKeyDown(event, view.id)}
              >
                <Icon aria-hidden="true" size={17} />
                {view.label}
              </button>
            )
          })}
        </div>

        {activeView === 'list' ? (
          <div className="specimen-list-tools">
            <div className="specimen-filter" role="group" aria-label="Filter specimens">
              <button type="button" aria-pressed={!flaggedOnly} onClick={() => changeFilter(false)}>
                All <span>{sites.length}</span>
              </button>
              <button type="button" aria-pressed={flaggedOnly} onClick={() => changeFilter(true)}>
                <Flag size={14} aria-hidden="true" /> Flagged <span>{flaggedSites.length}</span>
              </button>
              <InfoTip term="flags" />
            </div>
            <p>Original specimen labels <InfoTip term="location" /></p>
          </div>
        ) : (
          <div className="view-help">
            <TermLabel label="Approximate sample locations" term="schematic" />
            <ul className="sample-color-key" aria-label="Sample marker colors">
              <li className="tone-concern">Cancer Reported</li>
              <li className="tone-atypical">Atypical / PIN</li>
              <li className="tone-benign">Benign</li>
              <li className="tone-unknown">Unclear</li>
            </ul>
          </div>
        )}

        <div
          className="report-view"
          id="report-view-panel"
          role="tabpanel"
          aria-labelledby={`report-view-tab-${activeView}`}
        >
          {activeView === 'map' ? (
            <SpecimenMap
              sites={sites}
              selectedSiteId={selectedSite?.id}
              onSelectSite={onSelectSite}
            />
          ) : null}
          {activeView === 'three' ? (
            <ThreeDimensionalView
              sites={sites}
              selectedSiteId={selectedSite?.id}
              onSelectSite={onSelectSite}
            />
          ) : null}
          {activeView === 'list' ? (
            <SpecimenList
              sites={visibleSites}
              selectedSiteId={selectedSite?.id}
              onSelectSite={onSelectSite}
              highestGrade={highestGrade}
              emptyMessage={flaggedOnly ? 'No specimens match these flags. Choose All to review every sample.' : undefined}
            />
          ) : null}
        </div>
      </div>

      <FindingDetail
        key={selectedSite?.id ?? 'empty'}
        site={activeView === 'list' && flaggedOnly && flaggedSites.length === 0 ? undefined : selectedSite}
        highestGrade={highestGrade}
      />
    </div>
  )
}

function SpecimenMap({
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
}) {
  const mappedSites = sites.filter(
    (site) =>
      !site.isTargeted && site.side && site.region && site.track,
  )
  const targetedSites = sites.filter((site) => site.isTargeted)
  const unmappedSites = sites.filter(
    (site) =>
      !site.isTargeted && (!site.side || !site.region || !site.track),
  )

  return (
    <div className="specimen-map">
      <div className="map-orientation" aria-label="Patient orientation">
        <span>Patient right</span>
        <span>Patient left</span>
      </div>

      <div className="map-column-labels" aria-hidden="true">
        {columns.map((column) => (
          <span key={`${column.side}-${column.track}`}>
            {column.shortLabel}
          </span>
        ))}
      </div>

      <div className="anatomy-grid">
        {regions.flatMap((region) =>
          columns.map((column) => {
            const cellSites = mappedSites.filter(
              (site) =>
                site.side === column.side &&
                site.region === region &&
                site.track === column.track,
            )

            return (
              <div
                className="anatomy-cell"
                key={`${region}-${column.side}-${column.track}`}
              >
                <span className="anatomy-cell-region">{titleCase(region)}</span>
                {cellSites.length > 0 ? (
                  <div className="anatomy-cell-findings">
                    {cellSites.map((site) => (
                      <SpecimenButton
                        key={site.id}
                        site={site}
                        selected={site.id === selectedSiteId}
                        onSelectSite={onSelectSite}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <span className="anatomy-cell-empty">No mapped finding</span>
                )}
              </div>
            )
          }),
        )}
      </div>

      <p className="schematic-note">
        This shows the labels attached to tissue samples. It is not a tumor map
        and is not based on patient-specific MRI coordinates.
      </p>

      {targetedSites.length > 0 ? (
        <UnplacedGroup
          title="MRI-targeted samples"
          description="Kept separate because the report text does not provide coordinates for patient-specific placement."
          sites={targetedSites}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
        />
      ) : null}

      {unmappedSites.length > 0 ? (
        <UnplacedGroup
          title="Needs location review"
          description="These labels did not include enough consistent location detail to place them in the grid."
          sites={unmappedSites}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
        />
      ) : null}
    </div>
  )
}

function UnplacedGroup({
  title,
  description,
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  title: string
  description: string
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
}) {
  return (
    <section className="unplaced-group">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="unplaced-findings">
        {sites.map((site) => (
          <SpecimenButton
            key={site.id}
            site={site}
            selected={site.id === selectedSiteId}
            onSelectSite={onSelectSite}
          />
        ))}
      </div>
    </section>
  )
}

function ThreeDimensionalView({
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
}) {
  const schematicSites = sites.filter(isSchematicSite)
  const excludedSiteCount = sites.length - schematicSites.length

  return (
    <div className="three-view">
      <div className="three-stage">
        <Suspense
          fallback={
            <div className="three-loading">
              <ScanSearch aria-hidden="true" />
              Building the schematic view…
            </div>
          }
        >
          <Prostate3DView
            sites={schematicSites}
            selectedSiteId={selectedSiteId}
            onSelect={onSelectSite}
          />
        </Suspense>
      </div>
      <div className="three-accessible-list">
        <p>
          Rotate the model, or use this specimen list for the same selection.
          {excludedSiteCount > 0
            ? ` ${excludedSiteCount} sample${excludedSiteCount === 1 ? ' is' : 's are'} intentionally not placed without source coordinates or complete systematic location labels.`
            : ''}
        </p>
        <div>
          {schematicSites.map((site) => (
            <SpecimenButton
              key={site.id}
              site={site}
              selected={site.id === selectedSiteId}
              onSelectSite={onSelectSite}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SpecimenList({
  sites,
  selectedSiteId,
  onSelectSite,
  highestGrade,
  emptyMessage,
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
  highestGrade?: number
  emptyMessage?: string
}) {
  const selectedCardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const selectedCard = selectedCardRef.current
    const list = selectedCard?.closest('.specimen-list')

    if (selectedCard && list && list.scrollHeight > list.clientHeight) {
      const listBounds = list.getBoundingClientRect()
      const cardBounds = selectedCard.getBoundingClientRect()

      if (cardBounds.bottom > listBounds.bottom) {
        list.scrollTop += cardBounds.bottom - listBounds.bottom
      } else if (cardBounds.top < listBounds.top) {
        list.scrollTop -= listBounds.top - cardBounds.top
      }
    }
  }, [selectedSiteId, sites])

  if (sites.length === 0) {
    return emptyMessage ? <p className="empty-filter">{emptyMessage}</p> : <EmptyReport />
  }

  return (
    <div className="specimen-list">
      {sites.map((site) => (
        <button
          type="button"
          className={`specimen-list-card ${statusClass(site)} tone-${specimenTone(site)} ${
            site.id === selectedSiteId ? 'is-selected' : ''
          }`}
          key={site.id}
          onClick={() => onSelectSite(site.id)}
          aria-pressed={site.id === selectedSiteId}
          ref={site.id === selectedSiteId ? selectedCardRef : undefined}
        >
          <span className="specimen-list-status"><StatusIcon site={site} />{patientStatus(site)}</span>
          <strong>{site.sourceLabel}</strong>
          {isHighestReportedGrade(site, highestGrade) ? (
            <span className="specimen-flag highest-grade-flag"><Flag size={13} aria-hidden="true" /> Highest grade in this report</span>
          ) : null}
          {reportedFeatureFlags(site).map((flag) => <span className="specimen-flag" key={flag}>{flag}</span>)}
          {site.status === 'malignant' ? <dl>
            <div>
              <dt>Grade</dt>
              <dd>{site.gradeGroup ? `GG${site.gradeGroup}` : 'Not found'}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{formatCores(site)}</dd>
            </div>
            <div>
              <dt>Involvement</dt>
              <dd>{formatPercent(site.involvementPercent)}</dd>
            </div>
          </dl> : <span className="specimen-status-note">{site.status === 'benign'
            ? 'No cancer reported in this sample.'
            : site.status === 'suspicious'
              ? 'Abnormal cells; no definite cancer diagnosis here.'
              : 'Check the original diagnosis wording.'}</span>}
        </button>
      ))}
    </div>
  )
}

function SpecimenButton({
  site,
  selected,
  onSelectSite,
  compact = false,
}: {
  site: BiopsySite
  selected: boolean
  onSelectSite: (siteId: string) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={`specimen-button ${statusClass(site)} tone-${specimenTone(site)} ${
        selected ? 'is-selected' : ''
      } ${compact ? 'is-compact' : ''}`}
      onClick={() => onSelectSite(site.id)}
      aria-pressed={selected}
    >
      <span>{site.sourceLabel}</span>
      <strong>{site.gradeGroup ? `GG${site.gradeGroup}` : shortStatus(site)}</strong>
    </button>
  )
}

function FindingDetail({ site, highestGrade }: { site?: BiopsySite; highestGrade?: number }) {
  if (!site) {
    return (
      <aside className="finding-detail">
        <CircleDot aria-hidden="true" />
        <h3>No finding selected</h3>
        <p>Choose a specimen to see its parsed details and source wording.</p>
      </aside>
    )
  }

  return (
    <aside className={`finding-detail tone-${specimenTone(site)}`} aria-label="Selected specimen result">
      <div className="finding-detail-heading">
        <span className="finding-status">
          <StatusIcon site={site} />
          <TermLabel label={patientStatus(site)} term={site.status} />
        </span>
      </div>
      {isHighestReportedGrade(site, highestGrade) ? (
        <p className="selected-grade-flag"><Flag size={16} aria-hidden="true" /><TermLabel label="Highest grade in this report" term="highestGrade" /></p>
      ) : null}
      {site.status === 'suspicious' ? <p className="selected-status-note">This sample describes atypical cells or PIN, without a definite cancer diagnosis.</p> : null}
      <p className="finding-kicker">Original specimen label</p>
      <h3>{site.sourceLabel}</h3>
      <p className="source-label">
        <span><TermLabel label="Normalized location" term="location" /></span>
        {site.normalizedLabel}
      </p>

      <dl className="finding-facts">
        <Fact
          label="Gleason"
          term="gleason"
          value={formatGleason(site)}
          highlighted={site.status === 'malignant' && formatGleason(site) !== 'Not found'}
        />
        <Fact
          label="Grade Group"
          term="gradeGroup"
          value={site.gradeGroup ? `GG${site.gradeGroup}` : 'Not found'}
          highlighted={site.status === 'malignant' && site.gradeGroup !== undefined}
        />
        <Fact label="Positive cores" term="positiveCores" value={formatCores(site)} />
        <Fact
          label="Core involvement"
          term="involvement"
          value={formatPercent(site.involvementPercent)}
        />
        <Fact
          label="Pattern 4"
          term="pattern4"
          value={formatPercent(site.pattern4Percent)}
        />
        <Fact
          label="Cancer length"
          term="cancerLength"
          value={site.tumorMm === undefined ? 'Not found' : `${site.tumorMm} mm`}
        />
        <Fact
          label="Cribriform"
          term="cribriform"
          value={formatPresence(site.cribriform)}
          highlighted={site.cribriform === true}
        />
        <Fact
          label="IDC-P"
          term="intraductal"
          value={formatPresence(site.intraductal)}
          highlighted={site.intraductal === true}
        />
        {site.perineuralInvasion === true ? <Fact label="Perineural invasion" term="pni" value="Reported present" highlighted /> : null}
        {site.gleasonPrimary === 5 || site.gleasonSecondary === 5 || (site.pattern5Percent ?? 0) > 0 ? (
          <Fact label="Pattern 5" term="pattern5" value={site.pattern5Percent === undefined ? 'Present in Gleason score' : `${site.pattern5Percent}% reported`} highlighted />
        ) : null}
      </dl>
      <p className="missing-explanation"><TermLabel label="What does “not found” mean?" term="missing" /></p>

      <details className="secondary-detail">
        <summary>Other pathology details</summary>
        <p>
          <TermLabel label="Perineural invasion" term="pni" />: <strong>{formatPresence(site.perineuralInvasion)}</strong>
        </p>
      </details>

      <details className="source-evidence">
        <summary>Compare with source text</summary>
        <p><TermLabel label={`${titleCase(site.confidence)} text-reading confidence`} term="confidence" /></p>
        <p>{site.raw}</p>
      </details>
    </aside>
  )
}

function Fact({ label, value, term, highlighted = false }: { label: string; value: ReactNode; term: ExplanationKey; highlighted?: boolean }) {
  return (
    <div className={highlighted ? 'fact-highlight' : undefined}>
      <dt><TermLabel label={label} term={term} /></dt>
      <dd>{value}</dd>
    </div>
  )
}

function patientStatus(site: BiopsySite) {
  if (site.status === 'malignant') return 'Cancer reported'
  if (site.status === 'benign') return 'Benign'
  if (site.status === 'suspicious') return 'Atypical / PIN'
  return 'Needs wording review'
}

function StatusIcon({ site }: { site: BiopsySite }) {
  const Icon = specimenTone(site) === 'concern' ? Flag
    : site.status === 'benign' ? CircleCheck : CircleAlert
  return <Icon size={15} aria-hidden="true" />
}

function EmptyReport() {
  return (
    <div className="empty-report">
      <ScanSearch aria-hidden="true" />
      <h4>No specimen-level findings yet</h4>
      <p>Open the report lab to load a fictional demo or add report text.</p>
    </div>
  )
}

function shortStatus(site: BiopsySite) {
  if (site.status === 'benign') {
    return 'Benign'
  }
  if (site.status === 'suspicious') {
    return 'Atypical'
  }
  if (site.status === 'malignant') {
    return 'Cancer'
  }
  return 'Review'
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
