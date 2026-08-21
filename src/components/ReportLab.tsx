import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import type { ParseResult } from '../reportParser'
import {
  findPotentialIdentifiers,
  scrubPotentialIdentifiers,
} from '../reportPrivacy'

type ReportLabProps = {
  open: boolean
  reportText: string
  fileName: string
  parsed: ParseResult
  onChangeReportText: (text: string) => void
  onChangeFileName: (name: string) => void
  onLoadSample: () => void
  onReset: () => void
  onClose: () => void
}

export function ReportLab({
  open,
  reportText,
  fileName,
  parsed,
  onChangeReportText,
  onChangeFileName,
  onLoadSample,
  onReset,
  onClose,
}: ReportLabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const [scrubMessage, setScrubMessage] = useState('')
  const identifierMatches = useMemo(
    () => findPotentialIdentifiers(reportText),
    [reportText],
  )

  useEffect(() => {
    if (!open) {
      return undefined
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === first || !dialogRef.current?.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (activeElement === last || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeys)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleDialogKeys)
      previousFocusRef.current?.focus()
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  async function handleFile(file: File) {
    setFileError('')
    setScrubMessage('')
    setIsReadingFile(true)
    onChangeFileName(file.name)

    try {
      const text =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
          ? await extractPdfText(file)
          : await file.text()

      onChangeReportText(text)
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : 'The report could not be read.',
      )
    } finally {
      setIsReadingFile(false)
    }
  }

  function scrubText() {
    const result = scrubPotentialIdentifiers(reportText)
    onChangeReportText(result.text)
    onChangeFileName(
      fileName ? `${fileName} · de-identified copy` : 'De-identified text copy',
    )
    setScrubMessage(
      result.removedCount > 0
        ? `Replaced ${result.removedCount} potential identifier${result.removedCount === 1 ? '' : 's'}. Review every replacement before using the text.`
        : 'No supported identifier pattern was found. This is not proof that the text is de-identified.',
    )
  }

  return (
    <div
      className="report-lab-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        ref={dialogRef}
        className="report-lab"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-lab-title"
        aria-describedby="report-lab-privacy"
      >
        <header className="report-lab-header">
          <div>
            <span className="report-lab-kicker">Private report workspace</span>
            <h2 id="report-lab-title">Use a report in the prototype</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-control"
            aria-label="Close report workspace"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="report-lab-privacy" id="report-lab-privacy">
          <ShieldCheck aria-hidden="true" />
          <p>
            <strong>Processed in this browser.</strong> This prototype does not
            send report text to a server. Avoid identifiable reports on shared
            devices.
          </p>
        </div>

        <div className="report-lab-actions">
          <input
            ref={fileInputRef}
            id="report-file"
            type="file"
            accept=".pdf,.txt,.text,application/pdf,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleFile(file)
              }
            }}
          />
          <button
            type="button"
            className="primary-control"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload aria-hidden="true" size={17} />
            {isReadingFile ? 'Reading file…' : 'Upload PDF or text'}
          </button>
          <button type="button" className="quiet-control" onClick={onLoadSample}>
            <FileText aria-hidden="true" size={17} />
            Load fictional demo
          </button>
          <button type="button" className="quiet-control" onClick={onReset}>
            <RotateCcw aria-hidden="true" size={17} />
            Clear
          </button>
        </div>

        {fileError ? (
          <div className="report-lab-alert">
            <AlertTriangle aria-hidden="true" size={17} />
            {fileError}
          </div>
        ) : null}

        <label className="report-text-label" htmlFor="report-text">
          <span>Report text</span>
          <small>{fileName || 'Pasted text'}</small>
        </label>
        <textarea
          id="report-text"
          value={reportText}
          spellCheck={false}
          onChange={(event) => {
            setScrubMessage('')
            onChangeFileName('')
            onChangeReportText(event.target.value)
          }}
        />

        <div className="identifier-review">
          <div>
            <span>
              Identifier safety aid
              <strong>
                {identifierMatches.length > 0
                  ? `${identifierMatches.length} potential match${identifierMatches.length === 1 ? '' : 'es'}`
                  : 'No supported pattern found'}
              </strong>
            </span>
            <p>
              Checks common labeled names, MRNs, dates of birth, emails, phone
              numbers, and SSNs. It can miss unlabeled names and unusual
              formats.
            </p>
          </div>
          <button type="button" className="scrub-control" onClick={scrubText}>
            <ShieldCheck aria-hidden="true" size={17} />
            Make a de-identified copy
          </button>
        </div>

        {scrubMessage ? (
          <p className="scrub-message" role="status">
            {scrubMessage}
          </p>
        ) : null}

        <div className="report-lab-status">
          {parsed.warnings.length === 0 && parsed.sites.length > 0 ? (
            <span className="parse-success">
              <CheckCircle2 aria-hidden="true" />
              Parsed {parsed.sites.length} specimen
              {parsed.sites.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="parse-review">
              <AlertTriangle aria-hidden="true" />
              {parsed.sites.length} parsed · {parsed.warnings.length} note
              {parsed.warnings.length === 1 ? '' : 's'} to review
            </span>
          )}
          <button type="button" className="primary-control" onClick={onClose}>
            Explore this text
          </button>
        </div>

        <p className="deidentification-caveat">
          This scan is a safety net, not certified de-identification. Review the
          complete text before sharing or moving it to another service.
        </p>
      </section>
    </div>
  )
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
    const items = textContent.items.filter(
      (item): item is typeof item & { str: string; transform: number[] } =>
        'str' in item && 'transform' in item,
    )
    const sorted = items.toSorted((a, b) => {
      const yDifference = b.transform[5] - a.transform[5]
      if (Math.abs(yDifference) > 3) {
        return yDifference
      }
      return a.transform[4] - b.transform[4]
    })
    const lines: string[] = []
    let currentY: number | undefined

    for (const item of sorted) {
      const itemY = item.transform[5]
      if (currentY === undefined || Math.abs(currentY - itemY) > 3) {
        lines.push(item.str)
        currentY = itemY
      } else {
        lines[lines.length - 1] = `${lines.at(-1) ?? ''} ${item.str}`.trim()
      }
    }

    pages.push(lines.join('\n'))
  }

  return pages.join('\n\n')
}
