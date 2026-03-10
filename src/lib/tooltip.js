import { computePosition } from './floating.js';

/**
 * Svelte action for hover tooltips.
 *
 * Usage:
 *   use:tooltip={"Some text"}
 *   use:tooltip={{ text: "Some text", placement: "bottom", delay: 400 }}
 *
 * @param {HTMLElement} node
 * @param {string | { text: string, placement?: 'top'|'bottom'|'left'|'right', delay?: number }} params
 */
export function tooltip(node, params) {
	let text, placement, delay;
	let el = null;
	let timer = null;

	function parse(p) {
		if (typeof p === 'string') {
			text = p;
			placement = 'top';
			delay = 0;
		} else {
			text = p.text;
			placement = p.placement || 'top';
			delay = p.delay || 0;
		}
	}

	parse(params);

	function show() {
		if (el || !text) return;

		el = document.createElement('div');
		el.className = 'floating-tooltip';
		el.textContent = text;

		let arrow = document.createElement('div');
		arrow.className = 'floating-arrow';
		el.appendChild(arrow);

		document.body.appendChild(el);

		// Measure and position after the element is in the DOM
		let ref = node.getBoundingClientRect();
		let floating = el.getBoundingClientRect();
		let pos = computePosition(ref, floating, { placement });

		el.style.left = pos.x + 'px';
		el.style.top = pos.y + 'px';

		// Arrow: points toward the reference, so it sits on the side facing the reference
		let arrowSide = pos.placement;
		arrow.dataset.side = arrowSide;
		if (arrowSide === 'top' || arrowSide === 'bottom') {
			arrow.style.left = (pos.arrowX - 5) + 'px';
		} else {
			arrow.style.top = (pos.arrowY - 5) + 'px';
		}
	}

	function hide() {
		clearTimeout(timer);
		timer = null;
		if (el) {
			el.remove();
			el = null;
		}
	}

	function onEnter() {
		if (delay > 0) {
			timer = setTimeout(show, delay);
		} else {
			show();
		}
	}

	function onLeave() {
		hide();
	}

	node.addEventListener('mouseenter', onEnter);
	node.addEventListener('mouseleave', onLeave);
	node.addEventListener('focus', onEnter);
	node.addEventListener('blur', onLeave);

	return {
		update(newParams) {
			parse(newParams);
			// If tooltip is visible, reposition with new params
			if (el) {
				hide();
				show();
			}
		},
		destroy() {
			hide();
			node.removeEventListener('mouseenter', onEnter);
			node.removeEventListener('mouseleave', onLeave);
			node.removeEventListener('focus', onEnter);
			node.removeEventListener('blur', onLeave);
		},
	};
}
