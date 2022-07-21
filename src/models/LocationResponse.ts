import { OsmPoi } from '@/models/OsmPoi'

export interface LocationResponse {
    totalCount: number
    inside: OsmPoi[]
    nearby: OsmPoi[]
    countryCode?: string
    countryName?: string,
    stateName?: string,
    cityName?: string
}
