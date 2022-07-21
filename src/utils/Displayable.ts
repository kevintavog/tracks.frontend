// import { SearchTimezoneInfo } from '../models/SearchResults'
import { GpxSegment } from '@/models/Gpx'
import { DateTime } from 'luxon'

export abstract class Displayable {
  public static kilometersPerMile = 0.6213712
  public static yardsPerMile = 1760
  public static feetPerMile = 5280

  public static durationSeconds(seconds: number): string {
    if (seconds < 60) {
      return `0:${this.pad(seconds, 2)}`
    }
    if (seconds < 60 * 60) {
      const m = Math.floor(seconds / 60)
      const s = Math.round(seconds - (m * 60))
      return `${m}:${this.pad(s, 2)}`
    }

    const hours = Math.floor(seconds / (60 * 60))
    const hourSeconds = hours * 60 * 60
    const minutes = Math.floor((seconds - hourSeconds) / 60)
    const minuteSeconds = minutes * 60
    const sec = seconds - hourSeconds - minuteSeconds
    return `${hours}:${this.pad(minutes, 2)}:${this.pad(sec, 2)}`
  }

  public static durationAsSeconds(start: DateTime, end: DateTime): number {
    return Math.abs(start.diff(end).valueOf() / 1000)
  }

  public static secondsInSegment(segment: GpxSegment): number {
    const first = segment.points[0]
    const last = segment.points.slice(-1)[0]
    return this.durationAsSeconds(first.timestamp, last.timestamp)
  }

  public static distance(km: number): string {
    return this.distanceAsMiles(km)
  }

  public static pad(num: number, padding: number): string {
    return num.toString().padStart(padding, '0')
  }

  public static speed(seconds: number, kilometers: number): string {
      const kmh = kilometers / (seconds / (60 * 60))
      return this.speedFromKmh(kmh)
  }

  public static speedFromKmh(kmh: number): string {
    return this.speedAsMph(kmh)
  }

  public static dateToLocaleDate(date: Date | string): string {
    if (date != null) {
        const d = new Date(date)
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    return '?'
  }

  public static longDate(date: DateTime, zoneName: string): string {
    return this.dateTime(date, zoneName).toLocaleString(DateTime.DATE_FULL)
  }

  public static time(date: string | DateTime, zoneName: string): string {
    return this.dateTime(date, zoneName).toFormat('HH:mm:ss\xa0a')
  }

  public static dayOfWeek(date: string | DateTime, zoneName: string): string {
    return Displayable.dateTime(date, zoneName).weekdayLong
  }

  public static date(date: string | DateTime, zoneName: string): string {
    return this.dateTime(date, zoneName).toLocaleString({ locale: 'en-US' })
  }

  public static timeWithSeconds(date: string | DateTime, zoneName: string): string {
    return this.dateTime(date, zoneName).toFormat('HH:mm:ss')
  }

  public static shortTime(date: string | DateTime, zoneName: string): string {
    return this.dateTime(date, zoneName).toFormat('HH:mm\xa0a')
  }

  public static shortTimezoneName(zoneName: string): string {
    return DateTime.utc().setZone(zoneName).offsetNameShort
  }

  public static dateTime(date: string | DateTime, zoneName: string): DateTime {
    let iso: string
    if (date instanceof DateTime) {
      iso = (date as DateTime).toISO()
    } else {
      iso = date.toString()
    }
    const zone = zoneName === '' ? 'UTC' : zoneName
    return DateTime.fromISO(iso, { zone })
  }

  public static join(list: string[]): string {
    if (!list) {
      return ''
    }
    return list.join(', ')
  }

  public static firstFew(list: string[], limit = 3): string {
    if (!list) {
      return ''
    }
    let few = list.slice(0, limit).join(', ')
    if (list.length > limit) {
      few += ', ...'
    }
    return few
  }

  private static speedAsKmh(kmh: number): string {
    return `${Math.round(10 * kmh) / 10} km/h`
  }

  private static speedAsMph(kmh: number): string {
    const mph = kmh * Displayable.kilometersPerMile
    return `${Math.round(10 * mph) / 10} mph`
  }

  private static distanceAsMiles(km: number): string {
    const miles = km *  Displayable.kilometersPerMile
    if (miles < 0.0017) {
      return `${Math.round(miles * Displayable.feetPerMile)} feet`
    }
    if (miles < 1.0) {
      if (miles < 0.010) {
        return `${Math.round(miles * Displayable.yardsPerMile * 10) / 10} yards`
      }
      return `${Math.round(miles * Displayable.yardsPerMile)} yards`
    }
    return `${Math.round(100 * miles) / 100} miles`
  }

  private static distanceAsKilometers(km: number): string {
    if (km < 0.001) {
      return `${Math.round(km * 1000 * 100) / 100} meters`
    }
    if (km < 1.0) {
      if (km < 0.010) {
        return `${Math.round(km * 1000 * 10) / 10} meters`
      }
      return `${Math.round(km * 1000)} meters`
    }
    return `${Math.round(100 * km) / 100} km`
  }
}
