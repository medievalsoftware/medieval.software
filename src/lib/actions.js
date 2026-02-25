/** Svelte action: appends the node to document.body, removing on destroy. */
export function portal(node) {
	document.body.appendChild(node);
	return { destroy() { node.remove(); } };
}

/** Svelte action: nudges a position:fixed element so it stays within the viewport. */
export function clampToViewport(node) {
	const pad = 6;
	const rect = node.getBoundingClientRect();
	const maxX = window.innerWidth - pad;
	const maxY = window.innerHeight - pad;
	if (rect.right > maxX) node.style.left = Math.max(pad, maxX - rect.width) + 'px';
	if (rect.bottom > maxY) node.style.top = Math.max(pad, maxY - rect.height) + 'px';
}
