import L from 'leaflet'

export abstract class LeafletIcons {
  static blueIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-blue.png`)
  static goldIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-gold.png`)
  static redIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-red.png`)
  static greenIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-green.png`)
  static orangeIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-orange.png`)
  static yellowIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-yellow.png`)
  static violetIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-violet.png`)
  static greyIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-grey.png`)
  static blackIcon = LeafletIcons.makeIcon(`${process.env.BASE_URL}img/marker-icon-2x-black.png`)
  static allIcons = [
    LeafletIcons.blueIcon, LeafletIcons.goldIcon, LeafletIcons.redIcon, LeafletIcons.greenIcon,
    LeafletIcons.orangeIcon, LeafletIcons.yellowIcon, LeafletIcons.violetIcon, LeafletIcons.greyIcon,
    LeafletIcons.blackIcon]

  static getIcon(index: number): L.Icon {
    return this.allIcons[Math.floor(index % this.allIcons.length)]
  }

  static makeIcon(iconUrl: string): L.Icon {
    return new L.Icon({
      iconUrl: iconUrl,
      shadowUrl: `${process.env.BASE_URL}img/marker-shadow.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }
}
