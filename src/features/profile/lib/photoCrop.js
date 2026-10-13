export function getCropDrawRect(width, height, zoom, position, size = 512) {
  const scale = Math.max(size / width, size / height) * zoom
  const scaledWidth = width * scale
  const scaledHeight = height * scale
  return {
    x: (size - scaledWidth) / 2 + (position.x / 100) * ((scaledWidth - size) / 2),
    y: (size - scaledHeight) / 2 + (position.y / 100) * ((scaledHeight - size) / 2),
    width: scaledWidth,
    height: scaledHeight,
  }
}
