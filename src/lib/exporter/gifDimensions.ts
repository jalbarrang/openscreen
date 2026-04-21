import type { GIF_SIZE_PRESETS, GifSizePreset } from "./types";

/**
 * Calculate output dimensions based on size preset and source dimensions while preserving aspect ratio.
 * @param sourceWidth - Original video width
 * @param sourceHeight - Original video height
 * @param sizePreset - The size preset to use
 * @param sizePresets - The size presets configuration
 * @returns The calculated output dimensions
 */
export function calculateOutputDimensions(
	sourceWidth: number,
	sourceHeight: number,
	sizePreset: GifSizePreset,
	sizePresets: typeof GIF_SIZE_PRESETS,
	targetAspectRatio = sourceWidth / sourceHeight,
): { width: number; height: number } {
	const preset = sizePresets[sizePreset];
	const maxHeight = preset.maxHeight;
	const aspectRatio =
		Number.isFinite(targetAspectRatio) && targetAspectRatio > 0
			? targetAspectRatio
			: sourceWidth / sourceHeight;

	const toEven = (value: number) => {
		const evenValue = Math.max(2, Math.floor(value / 2) * 2);
		return evenValue;
	};

	if (sizePreset === "original") {
		const sourceAspect = sourceWidth / sourceHeight;
		if (aspectRatio >= sourceAspect) {
			const width = toEven(sourceWidth);
			const height = toEven(width / aspectRatio);
			return { width, height };
		}

		const height = toEven(sourceHeight);
		const width = toEven(height * aspectRatio);
		return { width, height };
	}

	const targetHeight = maxHeight;
	const targetWidth = Math.round(targetHeight * aspectRatio);

	return {
		width: toEven(targetWidth),
		height: toEven(targetHeight),
	};
}
