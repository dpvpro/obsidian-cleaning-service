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
) {
	const results = await Promise.all(arr.map(predicate));

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
