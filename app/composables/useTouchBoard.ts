import { ref, type Ref } from 'vue'

export interface TouchBoardOptions {
  onPlaceRequest: (row: number, col: number) => void
  boardElement: Ref<HTMLElement | null>
  boardViewport: Ref<HTMLElement | null>
  cellSize: Ref<number>
  getCellFromPoint?: (x: number, y: number) => { row: number; col: number } | null
}

export interface TouchBoardState {
  zoomLevel: Ref<number>
  panOffset: Ref<{ x: number; y: number }>
  selectedCell: Ref<{ row: number; col: number } | null>
  isPanning: Ref<boolean>
  isPinching: Ref<boolean>
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const PAN_THRESHOLD = 8 // pixels - movement beyond this is considered a pan
const DOUBLE_TAP_DELAY = 300 // ms
const GAP_SIZE = 8 // CSS gap between cells

export function useTouchBoard(options: TouchBoardOptions) {
  const { onPlaceRequest, boardElement, boardViewport, cellSize, getCellFromPoint } = options

  // State
  const zoomLevel = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  const selectedCell = ref<{ row: number; col: number } | null>(null)
  const isPanning = ref(false)
  const isPinching = ref(false)

  // Track last touch time to prevent synthetic click events on mobile
  const lastTouchTime = ref<number>(0)

  // Internal tracking
  const touchStartPos = ref<{ x: number; y: number } | null>(null)
  const initialPinchDistance = ref<number>(0)
  const initialZoomLevel = ref<number>(1)
  const lastTapTime = ref<number>(0)
  const lastTapCell = ref<{ row: number; col: number } | null>(null)
  const hasMoved = ref(false)
  const initialPanOffset = ref({ x: 0, y: 0 })

  // Helper: Calculate distance between two touch points
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
  }

  // Helper: Get center point of two touches
  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }

  // Helper: Convert screen coordinates to board cell
  const screenToCell = (screenX: number, screenY: number): { row: number; col: number } | null => {
    if (getCellFromPoint) {
      return getCellFromPoint(screenX, screenY)
    }

    if (!boardElement.value) return null

    // Use board element's bounding rect directly - it already accounts for:
    // - CSS transforms (scale, translate)
    // - Scroll position of parent containers
    // - Visual position on screen
    const boardRect = boardElement.value.getBoundingClientRect()

    // Calculate tap position relative to the board's visual (transformed) rect
    const transformedX = screenX - boardRect.left
    const transformedY = screenY - boardRect.top

    // Convert from transformed (scaled) space to local board coordinates
    // by dividing by the current zoom level
    const localX = transformedX / zoomLevel.value
    const localY = transformedY / zoomLevel.value

    // Subtract board padding (p-4 = 16px in Tailwind) to get content coordinates
    const BOARD_PADDING = 16
    const contentX = localX - BOARD_PADDING
    const contentY = localY - BOARD_PADDING

    // Check if tap is within the content area (not in padding)
    if (contentX < 0 || contentY < 0) return null

    // Calculate cell indices (accounting for gap between cells)
    const cellWithGap = cellSize.value + GAP_SIZE
    const col = Math.floor(contentX / cellWithGap)
    const row = Math.floor(contentY / cellWithGap)

    return { row, col }
  }

  // Helper: Clamp value between min and max
  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value))
  }

  // Touch Start Handler
  const handleTouchStart = (event: TouchEvent) => {
    const touches = event.touches

    if (touches.length === 2) {
      // Two fingers - start pinch zoom
      isPinching.value = true
      isPanning.value = false
      initialPinchDistance.value = getTouchDistance(touches)
      initialZoomLevel.value = zoomLevel.value
      hasMoved.value = true // Prevent tap action
    } else if (touches.length === 1) {
      // One finger - could be tap or pan
      touchStartPos.value = {
        x: touches[0].clientX,
        y: touches[0].clientY
      }
      initialPanOffset.value = { ...panOffset.value }
      hasMoved.value = false
      isPanning.value = false
    }
  }

  // Touch Move Handler
  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault() // Prevent browser zoom/scroll

    const touches = event.touches

    if (isPinching.value && touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = getTouchDistance(touches)
      if (initialPinchDistance.value > 0) {
        const scale = currentDistance / initialPinchDistance.value
        const newZoom = clamp(initialZoomLevel.value * scale, MIN_ZOOM, MAX_ZOOM)
        zoomLevel.value = newZoom
      }
    } else if (touches.length === 1 && touchStartPos.value) {
      // Handle potential pan
      const dx = touches[0].clientX - touchStartPos.value.x
      const dy = touches[0].clientY - touchStartPos.value.y
      const distance = Math.hypot(dx, dy)

      if (distance > PAN_THRESHOLD) {
        // Movement exceeds threshold - this is a pan
        hasMoved.value = true
        isPanning.value = true

        // Calculate pan bounds based on board dimensions and zoom level
        let maxPanX = 0
        let maxPanY = 0
        if (boardElement.value) {
          const boardWidth = boardElement.value.scrollWidth * zoomLevel.value
          const boardHeight = boardElement.value.scrollHeight * zoomLevel.value
          const viewportWidth = boardElement.value.clientWidth
          const viewportHeight = boardElement.value.clientHeight

          // Allow panning up to half the board size in each direction
          maxPanX = Math.max(0, (boardWidth - viewportWidth) / 2 + 100)
          maxPanY = Math.max(0, (boardHeight - viewportHeight) / 2 + 100)
        }

        // Apply pan with bounds clamping
        panOffset.value = {
          x: clamp(initialPanOffset.value.x + dx, -maxPanX, maxPanX),
          y: clamp(initialPanOffset.value.y + dy, -maxPanY, maxPanY)
        }
      }
    }
  }

  // Touch End Handler
  const handleTouchEnd = (event: TouchEvent) => {
    // Track touch time to prevent synthetic click events on mobile
    lastTouchTime.value = Date.now()

    if (isPinching.value) {
      // End pinch - check if any fingers remain
      if (event.touches.length < 2) {
        isPinching.value = false
        initialPinchDistance.value = 0

        // If one finger remains, reset for potential pan
        if (event.touches.length === 1) {
          touchStartPos.value = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
          }
          initialPanOffset.value = { ...panOffset.value }
          hasMoved.value = false
        }
      }
      return
    }

    if (isPanning.value) {
      // End pan
      isPanning.value = false
      touchStartPos.value = null
      return
    }

    // Check for tap (no significant movement)
    if (!hasMoved.value && touchStartPos.value) {
      const changedTouch = event.changedTouches[0]
      const cell = screenToCell(changedTouch.clientX, changedTouch.clientY)

      if (cell) {
        const now = Date.now()
        const isSameCell = lastTapCell.value?.row === cell.row && lastTapCell.value?.col === cell.col
        const isDoubleTap = (now - lastTapTime.value) < DOUBLE_TAP_DELAY && isSameCell
        const isTapOnSelected = selectedCell.value?.row === cell.row && selectedCell.value?.col === cell.col

        if (isDoubleTap || isTapOnSelected) {
          // Double tap or tap on selected cell - place piece
          onPlaceRequest(cell.row, cell.col)
          selectedCell.value = null
          lastTapCell.value = null
          lastTapTime.value = 0
        } else {
          // Single tap - select cell
          selectedCell.value = { row: cell.row, col: cell.col }
          lastTapCell.value = { row: cell.row, col: cell.col }
          lastTapTime.value = now
        }
      }
    }

    // Reset tracking
    touchStartPos.value = null
    isPanning.value = false
  }

  // Selection helpers
  const selectCell = (row: number, col: number) => {
    selectedCell.value = { row, col }
  }

  const clearSelection = () => {
    selectedCell.value = null
    lastTapCell.value = null
    lastTapTime.value = 0
  }

  const isSelectedCell = (row: number, col: number): boolean => {
    return selectedCell.value?.row === row && selectedCell.value?.col === col
  }

  // Zoom controls (for UI buttons if needed)
  const zoomIn = () => {
    zoomLevel.value = clamp(zoomLevel.value * 1.25, MIN_ZOOM, MAX_ZOOM)
  }

  const zoomOut = () => {
    zoomLevel.value = clamp(zoomLevel.value / 1.25, MIN_ZOOM, MAX_ZOOM)
  }

  const resetView = () => {
    zoomLevel.value = 1
    panOffset.value = { x: 0, y: 0 }
  }

  // Board transform style
  const getBoardTransform = () => {
    return {
      transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${zoomLevel.value})`,
      transformOrigin: 'center center'
    }
  }

  return {
    // State
    zoomLevel,
    panOffset,
    selectedCell,
    isPanning,
    isPinching,
    lastTouchTime,

    // Event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Helpers
    selectCell,
    clearSelection,
    isSelectedCell,
    screenToCell,

    // Zoom controls
    zoomIn,
    zoomOut,
    resetView,
    getBoardTransform
  }
}
