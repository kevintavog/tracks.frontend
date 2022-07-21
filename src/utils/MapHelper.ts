import L, { LatLng, LatLngExpression } from 'leaflet'
import { LeafletMouseEvent } from 'leaflet'
import { RangicMapEvent } from '@/models/RangicMapEvent'
import { Gpx, GpxBounds, GpxParser, GpxSegment, GpxWaypoint } from '@/models/Gpx'
import { GpxFeatureGroup  } from './GpxFeatureGroup'
import { Geo } from '@/utils/Geo'
import { MapSelectedType, MapSelection } from '@/models/MapSelection'
import cloneDeep from 'lodash.clonedeep'
import { Displayable } from './Displayable'

interface SegmentPathAndOptions {
  segment: GpxSegment
  path: L.Path
  options: L.PolylineOptions
}

interface WayPointPathAndOptions {
  waypoint: GpxWaypoint
  path: L.Path
  options: L.PolylineOptions
}

export class MapHelper {
  map: L.Map
  gpx: Gpx
  mapLayersControl?: L.Control.Layers
  gpxLayer?: GpxFeatureGroup

  private indexToSegment = new Map<string, SegmentPathAndOptions>()
  private indexToWaypoint = new Map<string, WayPointPathAndOptions>()

  private selectionCallback:(selection: MapSelection) => void
  private selectedPath?: L.Path
  private selectedOriginalOptions: L.PathOptions = {}

  private selectedSegmentOptions = {color: '#0000FF', weight: 10, opacity: 1}
  private selectedWaypointOptions = {color: '#0000FF', weight: 10, opacity: 1}

  private nextLineOption = 0
  private lineOptions: L.PolylineOptions[] = [
    { color: '#008B8B', weight: 5, dashArray: '', opacity: 0.9 },
    { color: '#6B8E23', weight: 5, dashArray: '', opacity: 0.9 },
    { color: '#CD5C5C', weight: 5, dashArray: '', opacity: 0.9 },
    { color: '#0000FF', weight: 5, dashArray: '', opacity: 0.7 },
    { color: '#663399', weight: 5, dashArray: '', opacity: 0.9 },
    { color: '#FF69B4', weight: 5, dashArray: '', opacity: 0.9 },
    { color: '#00FFFF', weight: 5, dashArray: '', opacity: 0.7 },
    { color: '#00FF7F', weight: 5, dashArray: '', opacity: 0.8 },
    { color: '#DC143C', weight: 5, dashArray: '', opacity: 0.8 },
    { color: '#87CEFA', weight: 5, dashArray: '', opacity: 0.8 },
    { color: '#6A5ACD', weight: 5, dashArray: '', opacity: 0.8 },
    { color: '#FF4500', weight: 5, dashArray: '', opacity: 0.8 },
  ]

  private waypointMetersOffset = 8
  private waypointOriginalOptions = { radius: this.waypointMetersOffset, weight: 4, color: 'red', opacity: 0.8, fillColor: 'red', fillOpacity: 0.4 }
  private waypointSlowpOptions = { weight: 4, color: 'black', opacity: 0.9, fill: true, fillColor: 'yellow', fillOpacity: 1.0 }
  private waypointStopOptions = { weight: 4, color: 'white', opacity: 0.9, fill: true, fillColor: 'red', fillOpacity: 1.0 }


  constructor(map: L.Map, gpx: Gpx, selectionCallback:(selection: MapSelection) => void) {
    this.map = map
    this.gpx = gpx
    this.selectionCallback = selectionCallback
  }

  selection(selection: MapSelection, center: boolean): void {
    if (selection.type === MapSelectedType.None) {
      this.clearSelection()
    } else {
      this.clearSelection()
      if (selection.type === MapSelectedType.Segment) {
        const entry = this.indexToSegment.get(`${selection.primaryIndex}:${selection.secondaryIndex}`)
        if (entry) {
          this.selectedPath = entry.path
          this.selectedOriginalOptions = cloneDeep(entry.options)
          this.selectedPath.setStyle(this.selectedSegmentOptions)
          if (center) {
            this.centerBounds(GpxParser.segmentBounds(entry.segment))
          }
        } else {
          console.error(`Unable to find segment: ${selection.primaryIndex}:${selection.secondaryIndex}`)
        }
      } else if (selection.type === MapSelectedType.Waypoint) {
        const entry = this.indexToWaypoint.get(`${selection.primaryIndex}`)
        if (entry) {
          this.selectedPath = entry.path
          this.selectedOriginalOptions = cloneDeep(entry.options)
          this.selectedPath.setStyle(this.selectedWaypointOptions)
          if (center) {
            this.centerPoint(new L.LatLng(entry.waypoint.latitude, entry.waypoint.longitude))
          }
        } else {
          console.error(`Unable to find waypoint: ${selection.primaryIndex}:${selection.secondaryIndex}`)
        }
      } else {
        console.error(`MapHelper - unknown selection type: ${selection.type}`)
      }
    }
  }

  centerBounds(bounds: GpxBounds): void {
    this.centerPoint(new L.LatLng((bounds.maxLat + bounds.minLat) / 2, (bounds.maxLon + bounds.minLon) / 2))
  }

  centerPoint(latlon: L.LatLng): void {
    this.map.panTo(latlon)
  }

  fitGpx(): void {
    this.fitBounds(this.gpx.bounds)
  }

  fitBounds(bounds: GpxBounds): void {
    const mapBounds = [
      [bounds.minLat, bounds.minLon],
      [bounds.maxLat, bounds.maxLon],
      ] as L.LatLngBoundsExpression
    this.map.fitBounds(mapBounds, { padding: [20, 20] })
  }

  clearSelection(): void {
    if (this.selectedPath) {
      this.selectedPath.setStyle(this.selectedOriginalOptions)
      this.selectedPath = undefined
    }
  }

  populateMap(): void {
    this.gpxLayer = new GpxFeatureGroup()
    const gpxGroup = this.gpxLayer
    const wayPointShortGroup = new GpxFeatureGroup().addTo(gpxGroup)
    const wayPointLongGroup = new GpxFeatureGroup().addTo(gpxGroup)
    const segmentGroup = new GpxFeatureGroup().addTo(gpxGroup)

    if (this.gpx.waypoints) {
      this.gpx.waypoints.forEach( (wp, index) => {
        this.addWaypoint(wayPointShortGroup, wayPointLongGroup, index, wp)
      })
    }

    this.gpx.tracks.forEach( (track, trackIndex) => {
      track.segments.forEach( (segment, segmentIndex) => {
        this.addSegment(segmentGroup, trackIndex, segmentIndex, segment)
      })
    })

    gpxGroup.addTo(this.map)
    this.addToMapLayersControl(gpxGroup, this.gpx.name)
    if (segmentGroup.getLayers().length > 0) {
      this.addToMapLayersControl(segmentGroup, this.textAndIconLabel('fa-route', 'Segments'))
    }
    if (wayPointLongGroup.getLayers().length > 0) {
      this.addToMapLayersControl(wayPointLongGroup, this.textAndIconLabel('fa-circle', 'Stops'))
    }
    if (wayPointShortGroup.getLayers().length > 0) {
      this.addToMapLayersControl(wayPointShortGroup, this.textAndIconLabel('fa-diamond', 'Pauses'))
    }
  }

  private addSegment(fg: L.FeatureGroup, trackIndex: number, segmentIndex: number, segment: GpxSegment): void {
    const segmentLatLngList = segment.points.map( (p) => {
      return new L.LatLng(p.latitude, p.longitude)
    })

    const options = this.getNextLineOptions()
    const line = new L.Polyline(segmentLatLngList, options)
    this.indexToSegment.set(`${trackIndex}:${segmentIndex}`, {segment: segment, path: line, options: options })
    // const id = `${this.gpx.name}; track #${trackIndex}; segment #${segmentIndex}`
    line.on('click', (e: LeafletMouseEvent) => {
      if (e) {
        (e.originalEvent as unknown as RangicMapEvent)._gpxHandled = true
        e.originalEvent.stopImmediatePropagation()
      }
      this.selectionCallback({ type: MapSelectedType.Segment, primaryIndex: trackIndex, secondaryIndex: segmentIndex })
      this.showSegmentPopup(segment, e.latlng)
    })

    line.addTo(fg)
 }

  private addWaypoint(shortGroup: L.FeatureGroup, longGroup: L.FeatureGroup, wayPointIndex: number, waypoint: GpxWaypoint): void {
    let poly: L.Path = new L.Circle([waypoint.latitude, waypoint.longitude], this.waypointOriginalOptions)
    if (waypoint.rangic) {
      if (waypoint.rangic.seconds >= 3*60) {
        const degreeOffset = 23
        const one = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, degreeOffset, this.waypointMetersOffset)
        const two = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 90-degreeOffset, this.waypointMetersOffset)
        const three = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 90+degreeOffset, this.waypointMetersOffset)
        const four = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 180-degreeOffset, this.waypointMetersOffset)
        const five = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 180+degreeOffset, this.waypointMetersOffset)
        const six = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 270-degreeOffset, this.waypointMetersOffset)
        const seven = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 270+degreeOffset, this.waypointMetersOffset)
        const eight = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 360-degreeOffset, this.waypointMetersOffset)

        const latlngs: LatLngExpression[] = [
          [one.lat, one.lon],
          [two.lat, two.lon],
          [three.lat, three.lon],
          [four.lat, four.lon],
          [five.lat, five.lon],
          [six.lat, six.lon],
          [seven.lat, seven.lon],
          [eight.lat, eight.lon],
          [one.lat, one.lon],
        ]
        poly = new L.Polyline(latlngs, this.waypointStopOptions).addTo(longGroup)
      } else {
        const e = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 90, this.waypointMetersOffset)
        const s = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 180, this.waypointMetersOffset)
        const w = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 270, this.waypointMetersOffset)
        const n = Geo.pointAlongBearing(waypoint.latitude, waypoint.longitude, 0, this.waypointMetersOffset)

        const latlngs: LatLngExpression[] = [
          [e.lat, e.lon],
          [s.lat, s.lon],
          [w.lat, w.lon],
          [n.lat, n.lon],
          [e.lat, e.lon], 
        ]
        poly = new L.Polyline(latlngs, this.waypointSlowpOptions).addTo(shortGroup)
      }
    } else {
      poly.addTo(shortGroup)
    }

    this.indexToWaypoint.set(wayPointIndex.toString(), {waypoint: waypoint, path: poly, options: poly.options })
    poly.on('click', (e: LeafletMouseEvent) => {
      (e.originalEvent as unknown as RangicMapEvent)._gpxHandled = true
      e.originalEvent.stopImmediatePropagation()
      this.selectionCallback({ type: MapSelectedType.Waypoint, primaryIndex: wayPointIndex, secondaryIndex: undefined })
      this.showWaypointPopup(waypoint)
    })
  }

  textAndIconLabel(faIconName: string, name: string): string {
    return `&emsp13;<i class="fa-solid ${faIconName}"></i> &ensp; ${name}`
  }

  addToMapLayersControl(layer: L.FeatureGroup, name: string): void {
    if (!this.mapLayersControl) {
      this.mapLayersControl = L.control.layers(
        undefined, { [name]: layer }, { position: 'topright', collapsed: false }).addTo(this.map as L.Map)
    } else {
      this.mapLayersControl.addOverlay(layer, name)
    }
  }

  private getNextLineOptions(): L.PolylineOptions {
    const lo = this.lineOptions[this.nextLineOption % this.lineOptions.length]
    this.nextLineOption += 1
    return lo
  }

  private showSegmentPopup(segment: GpxSegment, point: LatLng): void {
    const firstPoint = segment.points[0]
    const lastPoint = segment.points.slice(-1)[0]
    const seconds = Displayable.secondsInSegment(segment)
    const speed = Displayable.speed(seconds, segment.kilometers)
    let tt = ''
    if (segment.rangic && segment.rangic.transportationTypes.length > 0) {
      const first = segment.rangic.transportationTypes[0]
      tt = `, ${first.mode}`
    }

    let message = `${Displayable.timeWithSeconds(firstPoint.timestamp, segment.timezoneName)} - ` +
      `${Displayable.timeWithSeconds(lastPoint.timestamp, segment.timezoneName)}; ` +
      `${Displayable.distance(segment.kilometers)}, ` +
      `${speed}, ` +
      `${Displayable.durationSeconds(seconds)}` +
      `${tt}`
    const closestPoint = Geo.closestPoint(segment.points, point.lat, point.lng)
    if (closestPoint) {
      const pointTime = Displayable.timeWithSeconds(closestPoint.timestamp, segment.timezoneName)
      const pointSpeed = Displayable.speedFromKmh(closestPoint.calculatedKmh)
      const pointDistance = Displayable.distance(closestPoint.calculatedMeters / 1000)
      message += `<br>point ${pointTime} ${pointSpeed} ${pointDistance}`
    }
  
    this.map.openPopup(
      message,
      new LatLng(point.lat, point.lng),
      { minWidth: 400 })
  }

  private showWaypointPopup(waypoint: GpxWaypoint): void {
    let message = `${waypoint.name}; ${Displayable.shortTime(waypoint.timestamp, waypoint.timezoneName)}`
    if (waypoint.rangic) {
      const duration = Displayable.durationSeconds(waypoint.rangic.seconds)
      message = `${Displayable.shortTime(waypoint.rangic.beginTime, waypoint.timezoneName)}` +
        `-${Displayable.shortTime(waypoint.rangic.finishTime, waypoint.timezoneName)}; ` +
        `${waypoint.rangic.stopType}; ${duration}`
    }
    this.map.openPopup(
      message,
      new LatLng(waypoint.latitude, waypoint.longitude),
      { minWidth: 400 }
    )
  }

  // private getTrackMessage(): string {
  //   return `${Displayable.dayOfWeek(this.gpx.startDate, this.gpx.timezoneName)}, `
  //     + `${Displayable.date(this.gpx.startDate, this.gpx.timezoneName)}; `
  //     + `${Displayable.distance(this.gpx.kilometers)}, `
  //     + `${Displayable.durationSeconds(this.gpx.seconds)}`

  // }

  // private getSegmentMessage(segment: GpxSegment): string {
  //   const firstPoint = segment.points[0]
  //   const lastPoint = segment.points.slice(-1)[0]
  //   const seconds = Displayable.secondsInSegment(segment)
  //   const speed = Displayable.speed(seconds, segment.kilometers)
  //   return `` +
  //     `${Displayable.timeWithSeconds(firstPoint.timestamp, segment.timezoneName)} - ` +
  //     `${Displayable.timeWithSeconds(lastPoint.timestamp, segment.timezoneName)}; ` +
  //     `${Displayable.distance(segment.kilometers)}, ` +
  //     `${speed}, ` +
  //     `${Displayable.durationSeconds(seconds)}`

  // }
}
