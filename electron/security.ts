import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type BrowserWindow,
	type IpcMainEvent,
	type IpcMainInvokeEvent,
	shell,
	type WebContents,
	type WebFrameMain,
} from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, "..");
const RENDERER_DIST = path.join(APP_ROOT, "dist");
const RENDERER_ENTRY = path.join(RENDERER_DIST, "index.html");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const DEV_SERVER_ORIGIN = VITE_DEV_SERVER_URL ? new URL(VITE_DEV_SERVER_URL).origin : null;

const ALLOWED_PERMISSION_TYPES = new Set([
	"media",
	"display-capture",
	"audioCapture",
	"microphone",
	"videoCapture",
	"camera",
]);

function isTrustedRendererFilePath(filePath: string): boolean {
	return path.resolve(filePath) === path.resolve(RENDERER_ENTRY);
}

export function isTrustedAppUrl(url: string): boolean {
	if (!url) {
		return false;
	}

	if (DEV_SERVER_ORIGIN && url === DEV_SERVER_ORIGIN) {
		return true;
	}

	if (url === "file://") {
		return true;
	}

	try {
		const parsed = new URL(url);

		if (DEV_SERVER_ORIGIN && parsed.origin === DEV_SERVER_ORIGIN) {
			return true;
		}

		if (parsed.protocol === "file:") {
			return isTrustedRendererFilePath(fileURLToPath(parsed));
		}
	} catch {
		return false;
	}

	return false;
}

export function isTrustedWebContents(webContents: WebContents | null | undefined): boolean {
	if (!webContents || webContents.isDestroyed()) {
		return false;
	}

	const url = webContents.getURL();
	return Boolean(url) && isTrustedAppUrl(url);
}

export function isTrustedSenderFrame(frame: WebFrameMain | null | undefined): boolean {
	if (!frame?.url) {
		return false;
	}

	return isTrustedAppUrl(frame.url);
}

export function assertTrustedIpcSender(
	event: IpcMainEvent | IpcMainInvokeEvent,
	channel: string,
): void {
	if (isTrustedWebContents(event.sender) && isTrustedSenderFrame(event.senderFrame)) {
		return;
	}

	const sourceUrl =
		event.senderFrame?.url ?? (event.sender.isDestroyed() ? "<destroyed>" : event.sender.getURL());
	console.warn(`[security] Rejected IPC on ${channel} from ${sourceUrl}`);
	throw new Error(`Unauthorized IPC sender for channel: ${channel}`);
}

export function isAllowedPermission(permission: string): boolean {
	return ALLOWED_PERMISSION_TYPES.has(permission);
}

export function isTrustedPermissionRequest(
	webContents: WebContents | null,
	requestingOrigin?: string,
	requestingUrl?: string,
): boolean {
	if (!isTrustedWebContents(webContents)) {
		return false;
	}

	const candidates = [requestingUrl, requestingOrigin].filter(
		(value): value is string => typeof value === "string" && value.length > 0,
	);

	if (candidates.length === 0) {
		return true;
	}

	return candidates.every((candidate) => {
		if (candidate === "null" || candidate === "file://") {
			return true;
		}

		if (DEV_SERVER_ORIGIN && candidate === DEV_SERVER_ORIGIN) {
			return true;
		}

		return isTrustedAppUrl(candidate);
	});
}

export function isSafeExternalUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return ["http:", "https:", "mailto:"].includes(parsed.protocol);
	} catch {
		return false;
	}
}

export function hardenBrowserWindow(window: BrowserWindow): void {
	window.webContents.setWindowOpenHandler(({ url }) => {
		if (isSafeExternalUrl(url)) {
			setImmediate(() => {
				void shell.openExternal(url);
			});
		}

		return { action: "deny" };
	});

	window.webContents.on("will-navigate", (event, url) => {
		if (url === window.webContents.getURL()) {
			return;
		}

		if (!isTrustedAppUrl(url)) {
			event.preventDefault();
		}
	});
}
