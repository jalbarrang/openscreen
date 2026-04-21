function encodeRelativeAssetPath(relativePath: string): string {
	return relativePath
		.replace(/^\/+/, "")
		.split("/")
		.filter(Boolean)
		.map((part) => encodeURIComponent(part))
		.join("/");
}

function ensureTrailingSlash(value: string): string {
	return value.endsWith("/") ? value : `${value}/`;
}

export async function getAssetPath(relativePath: string): Promise<string> {
	const encodedRelativePath = encodeRelativeAssetPath(relativePath);

	try {
		if (typeof window !== "undefined") {
			// If running in a dev server (http/https), prefer an absolute web-served path.
			// Some worker-based consumers (for example web-demuxer) require a fully-qualified URL.
			if (
				window.location &&
				window.location.protocol &&
				window.location.protocol.startsWith("http")
			) {
				return new URL(`/${encodedRelativePath}`, window.location.href).toString();
			}

			if (window.electronAPI && typeof window.electronAPI.getAssetBasePath === "function") {
				const base = await window.electronAPI.getAssetBasePath();
				if (base) {
					return new URL(encodedRelativePath, ensureTrailingSlash(base)).toString();
				}
			}
		}
	} catch {
		// ignore and use fallback
	}

	if (typeof window !== "undefined" && window.location) {
		return new URL(`/${encodedRelativePath}`, window.location.href).toString();
	}

	return `/${encodedRelativePath}`;
}

export default getAssetPath;
