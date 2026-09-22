import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { reportExplanations, type ExplanationKey } from '../reportExplanations'

export function InfoTip({ term }: { term: ExplanationKey }) {
  const explanation = reportExplanations[term]
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLSpanElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pinned = useRef(false)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })

  function show() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function close() {
    clearTimeout(closeTimer.current)
    pinned.current = false
    setOpen(false)
  }

  function scheduleClose() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      if (!pinned.current && document.activeElement !== triggerRef.current) setOpen(false)
    }, 150)
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popupRef.current) return
    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect()
      const popup = popupRef.current?.getBoundingClientRect()
      if (!trigger || !popup) return
      const left = Math.max(12, Math.min(trigger.left - 12, window.innerWidth - popup.width - 12))
      const below = trigger.bottom + 8
      const top = below + popup.height <= window.innerHeight - 12
        ? below
        : Math.max(12, trigger.top - popup.height - 8)
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function dismiss(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event instanceof PointerEvent && (
        triggerRef.current?.contains(event.target as Node) ||
        popupRef.current?.contains(event.target as Node)
      )) return
      pinned.current = false
      setOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="info-tip-button"
        aria-label={`Explain ${explanation.title}`}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }}
        onPointerLeave={scheduleClose}
        onFocus={show}
        onBlur={close}
        onClick={() => {
          if (pinned.current) close()
          else { pinned.current = true; show() }
        }}
      >
        <Info aria-hidden="true" size={17} />
      </button>
      {open ? createPortal(
        <span
          ref={popupRef}
          id={id}
          role="tooltip"
          className="info-tip-popup"
          style={position}
          onPointerEnter={() => clearTimeout(closeTimer.current)}
          onPointerLeave={scheduleClose}
        >
          <strong>{explanation.title}</strong>
          <span>{explanation.body}</span>
        </span>,
        document.body,
      ) : null}
    </>
  )
}

export function TermLabel({ label, term }: { label: string; term: ExplanationKey }) {
  return <span className="report-term"><span>{label}</span><InfoTip term={term} /></span>
}
