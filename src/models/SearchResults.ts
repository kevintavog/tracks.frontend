import { OsmTagValue } from "./OsmPoi"

export interface SearchResults {
    matches: SearchTrack[]
    totalMatches: number
}

export interface SearchTrack {
    id: string
    path: string

    countries: string[]
    states: string[]
    cities: string[]
    sites: SearchTrackSite[]

    startTime: string
    endTime: string
    timezoneInfo: SearchTimezoneInfo

    kilometers: number
    seconds: number

    bounds: GeoBounds
}

export interface SearchTrackSite {
    name: string[]
    lat: number
    lon: number,
    tags?: OsmTagValue[]
}

export interface SearchTimezoneInfo {
    id: string
    tag: string
}

export interface GeoBounds {
    min: GeoPoint
    max: GeoPoint
}

export interface GeoPoint {
    latitude: number
    longitude: number
}
