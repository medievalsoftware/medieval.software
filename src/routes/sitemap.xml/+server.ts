import type { Post } from '$lib/types'

export async function GET({ fetch }) {
  const response = await fetch('api/posts')
  const posts: Post[] = await response.json()

  const staticPages = [
    { url: '/', priority: '1.0' },
    { url: '/rune-synergy', priority: '0.7' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>https://medieval.software${page.url}</loc>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${posts
  .map(
    (post) => `  <url>
    <loc>https://medieval.software/${post.slug}</loc>
    <lastmod>${new Date(post.date).toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  })
}
