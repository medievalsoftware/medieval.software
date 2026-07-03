export type Showcase = {
  name: string
  desc: string
  img: string
  /** Destination; '#' while the showcase is not yet live. */
  url: string
  /** Ribbon label shown on the card (e.g. 'In the Works'). */
  ribbon?: string
  /** Marks the card as a not-yet-live placeholder. */
  comingSoon?: boolean
}

/** Single source of truth for the Showcases panel (layout) and the /showcases page. */
export const showcases: Showcase[] = [
  {
    name: 'Voice Reels',
    desc: 'Exploring voice acting with character snippets and scenes',
    img: '/images/theatre_mask.png',
    url: '#',
    ribbon: 'In the Works',
    comingSoon: true,
  },
]
