export type RoadPoint = [number, number]

type SnapToRoadsResponse = {
  snappedPoints?: Array<{
    location?: {
      latitude?: number
      longitude?: number
    }
    originalIndex?: number
  }>
}

export type SnapToRoadsResult = {
  displayPoints: RoadPoint[]
  playbackPoints: RoadPoint[]
}

const MAX_POINTS_PER_REQUEST = 100
const CHUNK_OVERLAP = 1

const almostEqual = (left: RoadPoint, right: RoadPoint) => (
  Math.abs(left[0] - right[0]) < 1e-7 && Math.abs(left[1] - right[1]) < 1e-7
)

const toQueryPath = (points: RoadPoint[]) => points.map(([lat, lng]) => `${lat},${lng}`).join('|')

const buildChunkStarts = (length: number) => {
  const starts: number[] = []
  let start = 0

  while (start < length) {
    starts.push(start)
    if (start + MAX_POINTS_PER_REQUEST >= length) {
      break
    }
    start += MAX_POINTS_PER_REQUEST - CHUNK_OVERLAP
  }

  return starts
}

const fetchSnapChunk = async (points: RoadPoint[], apiKey: string) => {
  const params = new URLSearchParams({
    interpolate: 'true',
    key: apiKey,
    path: toQueryPath(points),
  })

  const response = await fetch(`https://roads.googleapis.com/v1/snapToRoads?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Roads API request failed with status ${response.status}`)
  }

  return response.json() as Promise<SnapToRoadsResponse>
}

export const snapRouteToRoads = async (points: RoadPoint[], apiKey: string): Promise<SnapToRoadsResult> => {
  if (!apiKey || points.length < 2) {
    return {
      displayPoints: points,
      playbackPoints: points,
    }
  }

  const starts = buildChunkStarts(points.length)
  const chunkResults = await Promise.all(starts.map(async (start) => {
    const chunk = points.slice(start, start + MAX_POINTS_PER_REQUEST)
    const data = await fetchSnapChunk(chunk, apiKey)
    return { start, snappedPoints: data.snappedPoints || [] }
  }))

  const displayPoints: RoadPoint[] = []
  const mappedPlaybackPoints = new Map<number, RoadPoint>()

  chunkResults
    .sort((left, right) => left.start - right.start)
    .forEach(({ start, snappedPoints }) => {
      snappedPoints.forEach((item) => {
        const point: RoadPoint = [Number(item.location?.latitude), Number(item.location?.longitude)]
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
          return
        }

        const lastPoint = displayPoints[displayPoints.length - 1]
        if (!lastPoint || !almostEqual(lastPoint, point)) {
          displayPoints.push(point)
        }

        if (typeof item.originalIndex === 'number') {
          mappedPlaybackPoints.set(start + item.originalIndex, point)
        }
      })
    })

  return {
    displayPoints: displayPoints.length > 1 ? displayPoints : points,
    playbackPoints: points.map((point, index) => mappedPlaybackPoints.get(index) || point),
  }
}
