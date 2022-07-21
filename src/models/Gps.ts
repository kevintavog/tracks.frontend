import { SearchTimezoneInfo } from '@/models/SearchResults'

export interface Gps {
    tracks: GpsTrack[]
    stops: GpsStop[]
    removedRuns: GpsRun[]
    timezoneInfo: SearchTimezoneInfo
    startTime: Date
    endTime: Date
    bounds: GpsBounds
    kilometers: number
    seconds: number
    movingSeconds: number
}

export interface GpsStop {
    startTime: Date
    endTime: Date
    firstPoint: GpsPoint
    lastPoint: GpsPoint
    countPoints: number
    bounds: GpsBounds
    seconds: number
}

export interface GpsBounds {
    min: GeoPoint
    max: GeoPoint
}

export interface GeoPoint {
    lat: number
    lon: number
}

export interface GpsTrack {
    runs: GpsRun[]
    bounds: GpsBounds
    seconds: number
    kilometers: number
}

export interface GpsRun {
    points: GpsPoint[]
    bounds: GpsBounds
    kilometers: number
    seconds: number
    kmh: number
    secondsIntoTrack: number
    kilometersIntoTrack: number
    transportationTypes: GpsTransportationType[]
}

export interface GpsPoint {
    latitude: number
    longitude: number
    time: string
    elevation: number
    course: number
    speedMs: number
    speedKmH: number
    transportationTypes: GpsTransportationType[]
    metersFromPrevious: number
    kilometersIntoRun: number
    secondsIntoRun: number
    calculatedSpeedKmHFromPrevious: number
    calculatedCourseFromPrevious: number
    movingAverageKmH: number
}

export const emptyGpsPoint: GpsPoint = {
    latitude: 0,
    longitude: 0,
    time: '',
    elevation: 0,
    course: 0,
    speedMs: 0,
    speedKmH: 0,
    transportationTypes: [],
    metersFromPrevious: 0,
    kilometersIntoRun: 0,
    secondsIntoRun: 0,
    calculatedSpeedKmHFromPrevious: 0,
    calculatedCourseFromPrevious: 0,
    movingAverageKmH: 0,
} as GpsPoint

export interface GpsTransportationType {
    probability: number
    mode: string
}
