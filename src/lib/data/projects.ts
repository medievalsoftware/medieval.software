export type ProjectCard = {
  name: string
  desc: string
  img: string
  url: string
  /** Optional inline style applied to the icon <img> (e.g. custom border-radius). */
  iconStyle?: string
}

export type ProjectSection = {
  title: string
  desc: string
  cards: ProjectCard[]
}

/** Single source of truth for the Projects panel (layout) and the /projects page. */
export const projectSections: ProjectSection[] = [
  {
    title: 'Forge',
    desc: 'Crafted in-house',
    cards: [
      {
        name: 'Herald',
        desc: 'Terminal IRC client over WebSocket',
        img: '/images/herald.png',
        url: 'https://github.com/medievalsoftware/herald',
      },
      {
        name: 'Knell',
        desc: 'SFX synthesizer',
        img: '/images/knell.png',
        url: 'https://knell.medieval.software',
      },
    ],
  },
  {
    title: 'Guild',
    desc: 'From friends and allies',
    cards: [
      {
        name: "King's Crook",
        desc: 'Open-world RPG built from scratch in pure C',
        img: '/images/kings_crook.png',
        url: 'https://kingscrook.itch.io/kings-crook',
        iconStyle: 'border-radius: var(--radius-xs)',
      },
    ],
  },
  {
    title: 'Frontier',
    desc: 'Discoveries from afar',
    cards: [
      {
        name: 'Flycast WASM',
        desc: 'Sega Dreamcast emulation in the browser via WebAssembly',
        img: '/images/flycast.png',
        url: 'https://flycast.medieval.software/',
      },
    ],
  },
]
