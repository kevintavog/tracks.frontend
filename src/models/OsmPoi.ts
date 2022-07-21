
export interface PoiGeoPoint {
    lat: number
    lon: number
}

export interface OsmTagValue {
    key: string
    value: string
}

export interface OsmPoi {
    id: string
    name: string
    point: PoiGeoPoint
    tags?: OsmTagValue[]
}
