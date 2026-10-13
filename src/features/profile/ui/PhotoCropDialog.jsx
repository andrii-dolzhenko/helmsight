import { useEffect, useRef, useState } from 'react'
import { PHOTO_DATA_URL_MAX_LENGTH } from '../lib/profile.js'
import { getCropDrawRect } from '../lib/photoCrop.js'
import styles from './PhotoCropDialog.module.css'

const IMAGE_SIZE = 512
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function PhotoCropDialog({ file, onConfirm, onClose }) {
  const dialogRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [image, setImage] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const nextImage = new Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.onerror = () => setError('The selected image could not be opened.')
    nextImage.src = url
    return () => {
      nextImage.onload = null
      nextImage.onerror = null
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (!image) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) {
      return
    }

    const rect = getCropDrawRect(image.naturalWidth, image.naturalHeight, zoom, position, IMAGE_SIZE)
    context.clearRect(0, 0, IMAGE_SIZE, IMAGE_SIZE)
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  }, [image, zoom, position])

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, start: position }
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const factor = 200 / rect.width
    setPosition({
      x: clamp(dragRef.current.start.x + (event.clientX - dragRef.current.x) * factor, -100, 100),
      y: clamp(dragRef.current.start.y + (event.clientY - dragRef.current.y) * factor, -100, 100),
    })
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!image || !canvas) return
    let result = ''
    for (const quality of [0.82, 0.7, 0.55]) {
      result = canvas.toDataURL('image/webp', quality)
      if (!result.startsWith('data:image/webp;')) {
        result = canvas.toDataURL('image/jpeg', quality)
      }
      if (result.length <= PHOTO_DATA_URL_MAX_LENGTH) break
    }
    if (result.length > PHOTO_DATA_URL_MAX_LENGTH) {
      setError('The processed image is too large to store. Try another photo.')
      return
    }
    onConfirm(result)
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="photo-dialog-title"
      aria-describedby="photo-dialog-help"
      onCancel={(event) => { event.preventDefault(); onClose() }}
    >
      <div className={styles.header}>
        <h2 id="photo-dialog-title">Edit profile photo</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close photo editor">×</button>
      </div>
      <p id="photo-dialog-help" className={styles.help}>
        Drag the image to reposition it, or adjust the position and zoom controls.
      </p>
      <div className={styles.preview}>
        <canvas
          ref={canvasRef}
          width={IMAGE_SIZE}
          height={IMAGE_SIZE}
          role="img"
          aria-label="Circular profile photo crop preview"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
        />
      </div>
      <div className={styles.sliders}>
        <label htmlFor="photo-zoom">Zoom</label>
        <input id="photo-zoom" type="range" min="1" max="3" step="0.05" value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))} />
        <label htmlFor="photo-horizontal">Horizontal position</label>
        <input id="photo-horizontal" type="range" min="-100" max="100" value={position.x}
          onChange={(event) => setPosition((current) => ({ ...current, x: Number(event.target.value) }))} />
        <label htmlFor="photo-vertical">Vertical position</label>
        <input id="photo-vertical" type="range" min="-100" max="100" value={position.y}
          onChange={(event) => setPosition((current) => ({ ...current, y: Number(event.target.value) }))} />
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.primary} disabled={!image || Boolean(error)} onClick={handleSave}>Use photo</button>
      </div>
    </dialog>
  )
}
