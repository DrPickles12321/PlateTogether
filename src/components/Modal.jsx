import { useEffect, useId, useRef } from 'react'
import { openLayer, isTopLayer } from '../lib/layerStack'
import Icon from './Icon'
import { createPortal } from 'react-dom'

export default function Modal({ isOpen, onClose, title, children, zIndex = 50 }) {
  const closeBtnRef = useRef(null)

  const layerId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // Keyed on isOpen only, so re-renders don't reorder the layer stack; Escape closes the top layer.
  useEffect(() => {
    if (!isOpen) return
    const closeLayer = openLayer(layerId)
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    function handleKeyDown(e) { if (e.key === 'Escape' && isTopLayer(layerId)) onCloseRef.current() }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; closeLayer() }
  }, [isOpen, layerId])

  if (!isOpen) return null

  // Portal to <body> so it stacks against bottom sheets and the tab bar, which are
  // also rendered there, instead of inside a page's stacking context.
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(29,33,43,0.38)', padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'white', borderRadius: 24,
          boxShadow: '0 24px 64px rgba(29,33,43,0.22)',
          padding: '30px', width: '100%', maxWidth: 420, position: 'relative',
          border: '1.5px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 className="font-lora" style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.2 }}>
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius)', border: '1.5px solid var(--border)',
              background: 'var(--surface-warm)', cursor: 'pointer', fontSize: 18,
              color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-warm)'}
          ><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
