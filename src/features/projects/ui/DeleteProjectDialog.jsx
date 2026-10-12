import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog.jsx'
import styles from './DeleteProjectDialog.module.css'

export function DeleteProjectDialog({ project, onCancel, onConfirm }) {
  const inputId = useId()
  const [confirmationName, setConfirmationName] = useState('')
  const [isPending, setIsPending] = useState(false)
  const inFlightRef = useRef(false)

  if (!project) return null

  const isExactMatch =
    project.name.length > 0 && confirmationName === project.name

  const handleConfirm = async () => {
    if (!isExactMatch || inFlightRef.current) return

    inFlightRef.current = true
    setIsPending(true)

    try {
      await onConfirm({
        projectId: project.id,
        confirmationName,
      })
    } finally {
      inFlightRef.current = false
      setIsPending(false)
    }
  }

  return (
    <ConfirmDialog
      isOpen
      eyebrow="Permanent deletion"
      title="Delete project?"
      message="This permanently deletes the project and its related records and saved drafts. This action cannot be undone."
      icon="trash"
      confirmLabel={isPending ? 'Deleting…' : 'Delete permanently'}
      cancelLabel="Keep project"
      confirmDisabled={!isExactMatch}
      isPending={isPending}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div className={styles.confirmationField}>
        <label className={styles.confirmationLabel} htmlFor={inputId}>
          Type <strong>{project.name}</strong> exactly to confirm:
        </label>
        <input
          id={inputId}
          className={styles.confirmationInput}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={confirmationName}
          disabled={isPending}
          onChange={(event) => setConfirmationName(event.target.value)}
        />
      </div>
    </ConfirmDialog>
  )
}
