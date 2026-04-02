import { App } from "obsidian";
export function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function partition<T>(
	array: T[],
	isValid: (el: T) => boolean,
): [T[], T[]] {
	return array.reduce<[T[], T[]]>(
		([pass, fail], elem) => {
			return isValid(elem)
				? [[...pass, elem], fail]
				: [pass, [...fail, elem]];
		},
		[[], []],
	);
}

export async function asyncFilter<T>(
	arr: T[],
	predicate: (e: T) => Promise<boolean>,
	batchSize = 50,
	enableLogging = false,
) {
	const results: boolean[] = [];
	const totalBatches = Math.ceil(arr.length / batchSize);

	if (enableLogging) {
		console.warn(`[asyncFilter] Processing ${arr.length} items in ${totalBatches} batches (size: ${batchSize})`);
	}

	// Process in batches to avoid overwhelming the file system
	for (let i = 0; i < arr.length; i += batchSize) {
		const batchNum = Math.floor(i / batchSize) + 1;
		const batch = arr.slice(i, i + batchSize);
		if (enableLogging) {
			console.warn(`[asyncFilter] Batch ${batchNum}/${totalBatches}...`);
		}
		const batchResults = await Promise.all(batch.map(predicate));
		results.push(...batchResults);
		if (enableLogging) {
			console.warn(`[asyncFilter] Batch ${batchNum}/${totalBatches} done`);
		}
	}

	return arr.filter((_v, index) => results[index]);
}

export function getFolders(app: App): string[] {
	// Note: vault.adapter.files is not part of the public Obsidian API types,
	// but exists at runtime. Using type casting is necessary here.
	interface FileInfo {
		type: string;
		realpath: string;
	}
	const adapter = app.vault.adapter as { files?: Record<string, FileInfo> };
	const files = adapter.files || {};
	const folders: string[] = [];
	for (const key in files) {
		if (files[key].type === "folder") {
			folders.push(files[key].realpath);
		}
	}
	return folders;
}
