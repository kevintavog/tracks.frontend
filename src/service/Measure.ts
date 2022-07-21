import { Displayable } from "@/utils/Displayable"
import { Geo } from "@/utils/Geo"
import L, { LatLng, LeafletMouseEvent } from "leaflet"

export class Measure {
  isClosed = false
  isActive = true
  map: L.Map
  allLayers = L.layerGroup()
  originalMapCursor = ''
  points: LatLng[] = []
  distanceMeters = 0.0

  // The points and lines of the existing measurements
  measuredLayer = L.layerGroup()
  measuredPolyline?: L.Polyline
  measuredLineStyle = {
    color: '#026159',
    dashArray: '4,6',
    weight: 6
  }
  measuredCircleStyle = {
    color: '#A502FE',
    radius: 10
  }

  // The line from the last point to the mouse position - only active after a point as been added
  floatingLayer = L.layerGroup()
  floatingPolyline?: L.Polyline
  floatingMarker?: L.CircleMarker
  floatingLineStyle = {
    color: '#FC03F9',
    dashArray: '1,6',
    radius: 1
  }

  constructor(map: L.Map) {
    this.map = map
    this.originalMapCursor = this.map.getContainer().style.cursor
    this.start()
  }

  close(): void {
    this.isClosed = true
    this.reset()
  }

  reset(): void {
    this.map.removeLayer(this.allLayers)
    this.map.getContainer().style.cursor = this.originalMapCursor

    this.stop()

    this.points = []
    this.distanceMeters = 0.0

    this.allLayers = L.layerGroup()
    this.measuredLayer = L.layerGroup().addTo(this.allLayers)
    this.measuredPolyline = undefined
    this.floatingLayer = L.layerGroup().addTo(this.allLayers)
    this.floatingPolyline = undefined
    this.floatingMarker = undefined

    this.allLayers.addTo(this.map)
  }

  stop(): void {
    this.map.off('click', this.mapMouseClicked)
    this.map.off('mousemove', this.mapMouseMoved)
    this.floatingLayer.removeFrom(this.map)
    this.isActive = false
  }

  start(): void {
    this.reset()
    this.isActive = true
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', e => this.mapMouseClicked(e))
    this.map.on('mousemove', e => this.mapMouseMoved(e))
  }

  mapMouseClicked(e: LeafletMouseEvent): void {
    if (this.isClosed) { return }
    if (!this.isActive) {
      this.start()
      return
    }
    this.points.push(e.latlng)
    const marker = L.circleMarker(e.latlng, this.measuredCircleStyle)
      .on('click', _e => this.stop())
      .addTo(this.measuredLayer)
    if (this.points.length > 1) {
      if (!this.measuredPolyline) {
        this.measuredPolyline = L.polyline(this.points, this.measuredLineStyle).addTo(this.measuredLayer)
      } else {
        this.measuredPolyline.setLatLngs(this.points)
      }
      const prevPoint = this.points[this.points.length - 2]
      const curPoint = this.points[this.points.length - 1]
      this.distanceMeters += Geo.distanceLL(prevPoint.lat, prevPoint.lng, curPoint.lat, curPoint.lng)

      marker.bindPopup(`Distance: ${this.readableMeasuredDistance()}`)
        .openPopup()
    }
  }

  mapMouseMoved(e: LeafletMouseEvent): void {
    if (this.isClosed) { return }
    if (!this.isActive) { return }
    if (this.points.length < 1) { return }

    const lastMeasuredPoint = this.points[this.points.length - 1]
    const floatDistance = Geo.distanceLL(lastMeasuredPoint.lat, lastMeasuredPoint.lng, e.latlng.lat, e.latlng.lng)

    // Add a floating line from the last point to the mouse position
    if (!this.floatingPolyline) {
      this.floatingPolyline = L.polyline([lastMeasuredPoint, e.latlng], this.floatingLineStyle).addTo(this.floatingLayer)
      this.floatingPolyline.addTo(this.floatingLayer)
    } else {
      this.floatingPolyline.setLatLngs([lastMeasuredPoint, e.latlng])
    }
    let message = `Floating distance: ${this.readableDistance(floatDistance)}`
    if (this.distanceMeters > 0) {
      message += `<br>Measured + floating distance: ${this.readableDistance(floatDistance + this.distanceMeters)}`
    }
    if (!this.floatingMarker) {
      this.floatingMarker = L.circleMarker(e.latlng, this.floatingLineStyle).addTo(this.floatingLayer)
      this.floatingMarker?.bindTooltip(
        message,
        {sticky: true, offset: L.point(10, 0) ,className: 'moving-tooltip'})
    } else {
      this.floatingMarker?.setLatLng(e.latlng)
      this.floatingMarker?.setTooltipContent(message)
    }
  }

  private readableMeasuredDistance(): string {
    return this.readableDistance(this.distanceMeters)
  }

  private readableDistance(meters: number): string {
    return `${Displayable.distance(meters / 1000)}`
  }
}
