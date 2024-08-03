import { json } from '@sveltejs/kit'
import type { Post } from '$lib/types'

export async function GET() {
  var posts: Post[] = []

  const paths = import.meta.glob("/src/posts/*.md", { eager: true })

  for (const path in paths) {
    const file = paths[path]
    const slug = path.split('/').at(-1)?.replace(".md", "")

    if (slug && file && typeof file === 'object' && 'metadata' in file) {
      const metadata = file.metadata as Omit<Post, 'slug'>
      const post = { ...metadata, slug } satisfies Post
      post.publish && posts.push(post)
    }
  }

  posts = posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return json(posts)
}