import { describe, expect, it } from 'vitest'
import { getCropDrawRect } from './photoCrop.js'

describe('getCropDrawRect', () => {
  it('automatically centers landscape and portrait uploads', () => {
    expect(getCropDrawRect(1024, 512, 1, { x: 0, y: 0 }))
      .toEqual({ x: -256, y: 0, width: 1024, height: 512 })
    expect(getCropDrawRect(512, 1024, 1, { x: 0, y: 0 }))
      .toEqual({ x: 0, y: -256, width: 512, height: 1024 })
  })

  it('supports zoom and manual repositioning without leaving blank pixels', () => {
    expect(getCropDrawRect(512, 512, 2, { x: -100, y: 100 }))
      .toEqual({ x: -512, y: 0, width: 1024, height: 1024 })
  })
})
