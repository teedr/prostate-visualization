import {
  Suspense,
  lazy,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  Box,
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
  isSchematicSite,
  statusClass,
  statusLabel,
} from '../reportSummary'

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
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'three', label: '3D', icon: Box },
  { id: 'list', label: 'Specimens', icon: List },
]

export function ReportExplorer({
  sites,
  selectedSiteId,
  onSelectSite,
  activeView,
  onChangeView,
}: ReportExplorerProps) {
  const selectedSite =
    sites.find((site) => site.id === selectedSiteId) ?? sites[0]

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
              sites={sites}
              selectedSiteId={selectedSite?.id}
              onSelectSite={onSelectSite}
            />
          ) : null}
        </div>
      </div>

      <FindingDetail site={selectedSite} />
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
}: {
  sites: BiopsySite[]
  selectedSiteId?: string
  onSelectSite: (siteId: string) => void
}) {
  if (sites.length === 0) {
    return <EmptyReport />
  }

  return (
    <div className="specimen-list">
      {sites.map((site) => (
        <button
          type="button"
          className={`specimen-list-card ${statusClass(site)} ${
            site.id === selectedSiteId ? 'is-selected' : ''
          }`}
          key={site.id}
          onClick={() => onSelectSite(site.id)}
        >
          <span className="specimen-list-status">{statusLabel(site)}</span>
          <strong>{site.sourceLabel}</strong>
          <span>Normalized: {site.normalizedLabel}</span>
          <dl>
            <div>
              <dt>Grade</dt>
              <dd>{site.gradeGroup ? `GG${site.gradeGroup}` : '—'}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{formatCores(site)}</dd>
            </div>
            <div>
              <dt>Involvement</dt>
              <dd>{formatPercent(site.involvementPercent)}</dd>
            </div>
          </dl>
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
      className={`specimen-button ${statusClass(site)} ${
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

function FindingDetail({ site }: { site?: BiopsySite }) {
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
    <aside className="finding-detail" aria-live="polite">
      <div className="finding-detail-heading">
        <span className={`finding-status ${statusClass(site)}`}>
          {statusLabel(site)}
        </span>
        <span>{titleCase(site.confidence)} parser confidence</span>
      </div>
      <p className="finding-kicker">Original specimen label</p>
      <h3>{site.sourceLabel}</h3>
      <p className="source-label">
        <span>Normalized location</span>
        {site.normalizedLabel}
      </p>

      <dl className="finding-facts">
        <Fact label="Gleason" value={formatGleason(site)} />
        <Fact
          label="Grade Group"
          value={site.gradeGroup ? `GG${site.gradeGroup}` : 'Not found'}
        />
        <Fact label="Positive cores" value={formatCores(site)} />
        <Fact
          label="Core involvement"
          value={formatPercent(site.involvementPercent)}
        />
        <Fact
          label="Pattern 4"
          value={formatPercent(site.pattern4Percent)}
        />
        <Fact
          label="Cancer length"
          value={site.tumorMm === undefined ? 'Not found' : `${site.tumorMm} mm`}
        />
        <Fact
          label="Cribriform"
          value={formatPresence(site.cribriform)}
        />
        <Fact
          label="IDC-P"
          value={formatPresence(site.intraductal)}
        />
      </dl>

      <details className="secondary-detail">
        <summary>Other pathology details</summary>
        <p>
          Perineural invasion: <strong>{formatPresence(site.perineuralInvasion)}</strong>
        </p>
      </details>

      <details className="source-evidence">
        <summary>Compare with source text</summary>
        <p>{site.raw}</p>
      </details>
    </aside>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
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
