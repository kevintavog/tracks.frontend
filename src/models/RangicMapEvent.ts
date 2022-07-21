import { LeafletMouseEvent } from 'leaflet'

export interface RangicMapEvent extends LeafletMouseEvent {
    _gpxHandled: boolean
}
