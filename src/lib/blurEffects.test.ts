import { describe, expect, it } from "vitest";
import { applyMosaicToImageData, getBlurOverlayColor, normalizeBlurColor } from "./blurEffects";

function createTestImageData(width: number, height: number) {
	const data = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const offset = (y * width + x) * 4;
			data[offset] = x * 20 + y;
			data[offset + 1] = y * 20 + x;
			data[offset + 2] = (x + y) * 10;
			data[offset + 3] = 255;
		}
	}

	return {
		data,
		width,
		height,
	} as ImageData;
}

describe("applyMosaicToImageData", () => {
	it("collapses each block to a single representative color", () => {
		const imageData = createTestImageData(4, 4);
		const original = new Uint8ClampedArray(imageData.data);

		applyMosaicToImageData(imageData, 2);

		const topLeft = Array.from(imageData.data.slice(0, 4));
		const topRightOffset = (1 * 4 + 1) * 4;
		const topRight = Array.from(imageData.data.slice(topRightOffset, topRightOffset + 4));
		expect(topLeft).toEqual(topRight);

		expect(Array.from(original.slice(0, 4))).not.toEqual(topLeft);
	});

	it("reduces unique pixel colors, making the transform information-lossy", () => {
		const imageData = createTestImageData(8, 8);
		const before = new Set<string>();
		const after = new Set<string>();

		for (let i = 0; i < imageData.data.length; i += 4) {
			before.add(
				`${imageData.data[i]}-${imageData.data[i + 1]}-${imageData.data[i + 2]}-${imageData.data[i + 3]}`,
			);
		}

		applyMosaicToImageData(imageData, 4);

		for (let i = 0; i < imageData.data.length; i += 4) {
			after.add(
				`${imageData.data[i]}-${imageData.data[i + 1]}-${imageData.data[i + 2]}-${imageData.data[i + 3]}`,
			);
		}

		expect(after.size).toBeLessThan(before.size);
		expect(after.size).toBe(4);
	});
});

describe("blur color helpers", () => {
	it("normalizes invalid blur colors to white", () => {
		expect(normalizeBlurColor("black")).toBe("black");
		expect(normalizeBlurColor("invalid")).toBe("white");
	});

	it("returns the expected overlay color for each blur type/color combination", () => {
		const cases = [
			{
				label: "black blur",
				input: {
					type: "blur",
					shape: "rectangle",
					color: "black",
					intensity: 12,
					blockSize: 12,
				},
				expected: "rgba(0, 0, 0, 0.56)",
			},
			{
				label: "black mosaic",
				input: {
					type: "mosaic",
					shape: "rectangle",
					color: "black",
					intensity: 12,
					blockSize: 12,
				},
				expected: "rgba(0, 0, 0, 0.72)",
			},
			{
				label: "white blur",
				input: {
					type: "blur",
					shape: "rectangle",
					color: "white",
					intensity: 12,
					blockSize: 12,
				},
				expected: "rgba(255, 255, 255, 0.02)",
			},
			{
				label: "white mosaic",
				input: {
					type: "mosaic",
					shape: "rectangle",
					color: "white",
					intensity: 12,
					blockSize: 12,
				},
				expected: "rgba(255, 255, 255, 0.06)",
			},
		] as const;

		for (const testCase of cases) {
			expect(getBlurOverlayColor(testCase.input), testCase.label).toBe(testCase.expected);
		}
	});
});
