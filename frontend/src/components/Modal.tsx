import type { ReactNode } from 'react'
import './Modal.css'

interface Props {
  titre: string
  children: ReactNode
  onClose: () => void
}

function Modal({ titre, children, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>{titre}</h3>
          <button className="ghost" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
