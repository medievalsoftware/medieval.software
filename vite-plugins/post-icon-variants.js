import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import matter from 'gray-matter';

const VIRTUAL_ID = 'virtual:post-icon-manifest';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

const RASTER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/**
 * @typedef {Object} Options
 * @property {number[]} [sizes]
 * @property {string} [staticDir]
 * @property {string} [postsDir]
 * @property {string[]} [additionalSources]
 */

/**
 * Scans post frontmatter for `icon:` URLs and generates any missing
 * size variants (e.g. foo-32px.png) next to each source. Existing
 * variants are left untouched so hand-tuned overrides are safe.
 * Exposes the result as a virtual module.
 *
 * @param {Options} [options]
 * @returns {import('vite').Plugin}
 */
export default function postIconVariants(options = {}) {
	const sizes = options.sizes ?? [32, 48, 64, 96];
	const staticDir = options.staticDir ?? 'static';
	const postsDir = options.postsDir ?? 'src/posts';
	const additional = options.additionalSources ?? [];

	let root = process.cwd();
	/** @type {Record<string, number[]>} */
	let manifest = {};

	const variantPath = (/** @type {string} */ file, /** @type {number} */ size) => {
		const ext = path.extname(file);
		return file.slice(0, -ext.length) + `-${size}px` + ext;
	};

	const collectIconUrls = async () => {
		const urls = new Set(additional);
		const postsAbs = path.resolve(root, postsDir);
		let entries;
		try {
			entries = await fs.readdir(postsAbs);
		} catch {
			return urls;
		}
		for (const entry of entries) {
			if (!entry.endsWith('.md')) continue;
			const src = await fs.readFile(path.join(postsAbs, entry), 'utf8');
			const { data } = matter(src);
			if (typeof data.icon === 'string') urls.add(data.icon);
		}
		return urls;
	};

	const buildManifest = async () => {
		const urls = await collectIconUrls();
		/** @type {Record<string, number[]>} */
		const result = {};

		for (const url of urls) {
			if (!url.startsWith('/')) continue;
			const ext = path.extname(url).toLowerCase();
			if (!RASTER_EXTS.has(ext)) continue;

			const sourceAbs = path.resolve(root, staticDir, url.replace(/^\//, ''));
			try {
				const stat = await fs.stat(sourceAbs);
				if (!stat.isFile()) continue;
			} catch {
				continue;
			}

			const available = [];
			for (const size of sizes) {
				const out = variantPath(sourceAbs, size);
				let exists = false;
				try {
					await fs.access(out);
					exists = true;
				} catch {
					/* not there, we'll generate it */
				}
				if (!exists) {
					try {
						await sharp(sourceAbs)
							.resize(size, size, { fit: 'inside', withoutEnlargement: false })
							.toFile(out);
						// eslint-disable-next-line no-console
						console.log(`[post-icon-variants] generated ${path.relative(root, out)}`);
					} catch (err) {
						// eslint-disable-next-line no-console
						console.warn(`[post-icon-variants] failed to generate ${out}:`, err);
						continue;
					}
				}
				available.push(size);
			}
			if (available.length) result[url] = available;
		}

		return result;
	};

	return {
		name: 'post-icon-variants',

		async configResolved(config) {
			root = config.root;
			manifest = await buildManifest();
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_ID) {
				return `export const manifest = ${JSON.stringify(manifest)};\n`;
			}
		},

		async handleHotUpdate(ctx) {
			const rel = path.relative(root, ctx.file);
			if (!rel.startsWith(postsDir) && !rel.startsWith(staticDir)) return;
			manifest = await buildManifest();
			const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
			if (mod) {
				ctx.server.moduleGraph.invalidateModule(mod);
				ctx.server.ws.send({ type: 'full-reload' });
			}
		}
	};
}
