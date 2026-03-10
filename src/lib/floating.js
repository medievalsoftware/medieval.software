const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * Compute position for a floating element relative to a reference element.
 * Handles flip (switch to opposite side if overflowing) and shift (slide along axis to stay in viewport).
 *
 * @param {{ x: number, y: number, width: number, height: number }} ref - reference element rect
 * @param {{ width: number, height: number }} floating - floating element dimensions
 * @param {{ placement?: 'top'|'bottom'|'left'|'right', gap?: number, padding?: number }} opts
 * @returns {{ x: number, y: number, placement: string, arrowX: number, arrowY: number }}
 */
export function computePosition(ref, floating, opts = {}) {
	let placement = opts.placement || 'top';
	let gap = opts.gap ?? 8;
	let padding = opts.padding ?? 8;
	let vw = window.innerWidth;
	let vh = window.innerHeight;

	function calc(side) {
		let x, y;
		if (side === 'top') {
			x = ref.x + ref.width / 2 - floating.width / 2;
			y = ref.y - floating.height - gap;
		} else if (side === 'bottom') {
			x = ref.x + ref.width / 2 - floating.width / 2;
			y = ref.y + ref.height + gap;
		} else if (side === 'left') {
			x = ref.x - floating.width - gap;
			y = ref.y + ref.height / 2 - floating.height / 2;
		} else {
			x = ref.x + ref.width + gap;
			y = ref.y + ref.height / 2 - floating.height / 2;
		}
		return { x, y };
	}

	let pos = calc(placement);

	// Flip if overflowing on the placement axis
	let overflow =
		(placement === 'top' && pos.y < padding) ||
		(placement === 'bottom' && pos.y + floating.height > vh - padding) ||
		(placement === 'left' && pos.x < padding) ||
		(placement === 'right' && pos.x + floating.width > vw - padding);

	if (overflow) {
		let flipped = OPPOSITE[placement];
		let altPos = calc(flipped);
		let altOverflow =
			(flipped === 'top' && altPos.y < padding) ||
			(flipped === 'bottom' && altPos.y + floating.height > vh - padding) ||
			(flipped === 'left' && altPos.x < padding) ||
			(flipped === 'right' && altPos.x + floating.width > vw - padding);
		if (!altOverflow) {
			placement = flipped;
			pos = altPos;
		}
	}

	// Shift along the cross-axis to stay in viewport
	if (placement === 'top' || placement === 'bottom') {
		pos.x = Math.max(padding, Math.min(vw - floating.width - padding, pos.x));
	} else {
		pos.y = Math.max(padding, Math.min(vh - floating.height - padding, pos.y));
	}

	// Arrow position: centered on reference, clamped to floating element bounds
	let arrowX = 0, arrowY = 0;
	if (placement === 'top' || placement === 'bottom') {
		arrowX = ref.x + ref.width / 2 - pos.x;
		arrowX = Math.max(10, Math.min(floating.width - 10, arrowX));
	} else {
		arrowY = ref.y + ref.height / 2 - pos.y;
		arrowY = Math.max(10, Math.min(floating.height - 10, arrowY));
	}

	return { x: pos.x, y: pos.y, placement, arrowX, arrowY };
}
