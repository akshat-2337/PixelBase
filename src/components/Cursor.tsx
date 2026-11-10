import { useEffect, useRef } from 'react'

const INTERACTIVE =
  'a, button, [role="button"], summary, label, select, input[type="file"], [data-cursor="hover"]'
const TEXT_FIELD =
  'textarea, [contenteditable="true"], input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])'

type PopoverElement = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

export function Cursor() {
  const host = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Mouse/trackpad only. Skip touch devices.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const el = host.current!
    const pop = el as PopoverElement
    const root = document.documentElement
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ease = reduceMotion ? 1 : 0.18

    root.classList.add('has-custom-cursor')

    // Set imperatively: older @types/react has no `popover` prop.
    el.setAttribute('popover', 'manual')

    // Popover puts the cursor in the top layer so it renders above <dialog> modals.
    const promote = () => {
      if (!pop.showPopover) return
      try {
        if (el.matches(':popover-open')) pop.hidePopover?.()
        pop.showPopover()
      } catch {
        /* unsupported, fixed positioning fallback */
      }
    }
    promote()

    // Re-promote whenever a dialog opens so the cursor stays on top.
    const observer = new MutationObserver(promote)
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    })

    let x = -100,
      y = -100,
      rx = -100,
      ry = -100,
      raf = 0

    const loop = () => {
      rx += (x - rx) * ease
      ry += (y - ry) * ease
      if (dot.current && ring.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      el.dataset.hidden = 'false'
    }
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null
      el.dataset.hover = String(!!t?.closest?.(INTERACTIVE))
      el.dataset.text = String(!!t?.closest?.(TEXT_FIELD))
    }
    const onDown = () => {
      el.dataset.down = 'true'
    }
    const onUp = () => {
      el.dataset.down = 'false'
    }
    const onLeave = () => {
      el.dataset.hidden = 'true'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    root.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      root.classList.remove('has-custom-cursor')
      el.removeAttribute('popover')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      root.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      ref={host}
      className="cursor-host"
      data-hidden="true"
      data-hover="false"
      data-down="false"
      data-text="false"
      aria-hidden="true"
    >
      <div ref={ring} className="cursor-ring" />
      <div ref={dot} className="cursor-dot" />
    </div>
  )
}