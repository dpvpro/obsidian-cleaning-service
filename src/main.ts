import { DatePickerModal } from "./Views/DatePickerModal";
import { OperationType } from "./CleaningServiceSettings";
import { CleaningServiceModal } from "./Views/CleaningServiceModal";

import { MarkdownView, Notice, Plugin, stringifyYaml } from "obsidian";
import { FileScanner } from "src/FileScanner";
import {
	DEFAULT_SETTINGS,
	CleaningServiceSettings,
} from "src/CleaningServiceSettings";
import CleaningServiceSettingsTab from "src/PluginSettingsTab";
import { FileProcessor } from "src/FileProcessor";

// moment is globally available in Obsidian
declare const moment: {
    (): Moment;
    (date: string, format?: string): Moment;
    unitOfTime: {
        DurationConstructor: string;
    };
};

interface Moment {
    format(format?: string): string;
    add(n: number, unit: string): Moment;
    isBefore(date: number): boolean;
    isValid(): boolean;
    valueOf(): number;
}

export default class CleaningServicePlugin extends Plugin {
	settings: CleaningServiceSettings;
	statusBarItemEl: HTMLElement;
	ribbonIconEl: HTMLElement;
	initialScanDone = false;

	async onload() {
		this.initialScanDone = false;
		await this.loadSettings();

		if (this.settings.addRibbonIcon) {
			this.addIcon();
		}

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		this.statusBarItemEl = this.addStatusBarItem();
		this.updateStatusBar("");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "scan-files",
			name: "Scan files",
			callback: () => {
				void this.scanFiles();
			},
		});
		this.addCommand({
			id: "scan-files-noprompt",
			name: "Scan files (without prompt)",
			callback: () => {
				void this.scanFiles(false, true);
			},
		});
		this.addCommand({
			id: "scan-files-with-prompt",
			name: "Scan files (with prompt)",
			callback: () => {
				void this.scanFiles(true, false);
			},
		});

		this.addCommand({
			id: "set-expiration",
			name: "Sets the expiration date of the current note",
			checkCallback: (checking: boolean) => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						void this.chooseDate(markdownView);
					}
					return true;
				}
				return false;
			},
		});

		this.createShortcutCommand(
			"set-expiration-1week",
			"Set expiration (1 week)",
			1,
			"week",
		);
		this.createShortcutCommand(
			"set-expiration-1month",
			"Set expiration (1 month)",
			1,
			"month",
		);
		this.createShortcutCommand(
			"set-expiration-1year",
			"Set expiration (1 year)",
			1,
			"year",
		);

		this.addSettingTab(new CleaningServiceSettingsTab(this.app, this));

		// this.app.workspace.onLayoutReady(()=>{
		// 	if (this.settings.runAtStartup) {
		// 		this.scanFiles();
		// 	}
		// })

		this.app.metadataCache.on("resolved", () => {
			if (this.settings.runAtStartup && !this.initialScanDone) {
				this.initialScanDone = true;
				void this.scanFiles();
			}
		});
	}

	frontMatterRegEx = /^---$(.*)^---/ms;

	private createShortcutCommand(
		id: string,
		name: string,
		n: number,
		w: moment.unitOfTime.DurationConstructor,
	) {
		this.addCommand({
			id: id,
			name: name,
			checkCallback: (checking: boolean) => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						const date = moment().add(n, w).format(this.settings.expiredDateFormat);
						void this.updateNoteWithDate(
							markdownView,
							date,
						);
					}
					return true;
				}
				return false;
			},
		});
	}

	async chooseDate(view: MarkdownView) {
		new DatePickerModal(this.app, this, view).open();
	}

	async updateNoteWithDate(view: MarkdownView, dateToSet: string) {
		if (!view.file) {
			return;
		}
		const file = view.file;
		const fileCache = this.app.metadataCache.getFileCache(file);
		const metaData = fileCache?.frontmatter;
		const position = fileCache?.frontmatter?.position as { start: { offset: number }; end: { offset: number } } | undefined;
		let start: number = position?.start?.offset ?? 0;
		let end: number = position?.end?.offset ?? 0;
		// no metadata could also mean empty metadata secion
		const newMetadata: Record<string, unknown> = {
			...metaData,
			[this.settings.expiredAttribute]: dateToSet,
		};
		const newYaml = stringifyYaml(newMetadata);
		const content = await this.app.vault.cachedRead(file);
		const m = this.frontMatterRegEx.exec(content);
		if (!metaData && m) {
			//empty frontmatter
			start = m.index;
			end = m.index + m[0].length;
		}
		const frontMatter = "---\n" + newYaml + "---\n";
		// if(view.getMode()) reading = "preview" edit = "source"
		if (view.getMode() === "source") {
			view.editor.replaceRange(
				frontMatter,
				view.editor.offsetToPos(start),
				view.editor.offsetToPos(end),
			);
		} else {
			const newContent =
				content.substring(0, start) +
				frontMatter +
				content.substring(end);
			void this.app.vault.modify(file, newContent);
		}
	}

	private updateStatusBar(message: string) {
		this.statusBarItemEl.setText(message);
	}

	private async scanFiles(forcePrompt = false, noPrompt = false) {
		new Notice("Cleaning service is scanning vault");
		this.updateStatusBar("Cleaning service scanning...");
		let modal;
		const results = await new FileScanner(this.app, this.settings).scan();
		// artificially introduce waiting for testing purposes
		// await delay(1000);
		const foundSomething =
			(results.orphans && results.orphans.length) ||
			(results.empty && results.empty.length) ||
			(results.expired && results.expired.length) ||
			(results.big && results.big.length) ||
			(results.emptyDirectories && results.emptyDirectories.length);
		this.updateStatusBar("");
		if (!foundSomething) {
			new Notice(`Cleaning service scanned and found nothing to clean up`);
			return;
		}
		// We determine if we have to prompt the user,
		// even if user disabled prompting, we could have to prompt
		// for big files to avoid deleting important stuff in an unattended way
		if (
			(this.settings.promptUser && !noPrompt) ||
			(results.big?.length && this.settings.promptForBigFiles) ||
			forcePrompt
		) {
			modal = new CleaningServiceModal(this.app, this);
			modal.open();
		}
		if (modal) {
			// if we have to prompt the user let's him/her decide which files
			// and which action to perform
			modal.updateState(results);
		} else {
			// we should process all available files
			let files = [
				results.orphans,
				results.empty,
				results.expired,
				results.big,
			].flatMap((list) => (list ? list.map((file) => file.path) : []));
			files = [...new Set(files)];

			// Handle empty directories separately
			const directories = results.emptyDirectories || [];

			await this.perform(this.settings.defaultOperation, files);
			if (directories.length > 0) {
				await this.performOnDirectories(
					this.settings.defaultOperation,
					directories,
				);
			}
		}
	}

	async perform(operation: OperationType, files: string[]) {
		const fileProcessor = new FileProcessor(this.app);
		const processingResult = await fileProcessor.process(files, operation);
		new Notice(
			`${processingResult.deletedFiles} files deleted.` +
				(processingResult.notDeletedFiles
					? `${processingResult.notDeletedFiles} files not deleted`
					: ""),
		);
	}

	async performOnDirectories(
		operation: OperationType,
		directories: string[],
	) {
		const fileProcessor = new FileProcessor(this.app);
		const processingResult = await fileProcessor.processDirectories(
			directories,
			operation,
		);
		new Notice(
			`${processingResult.deletedFiles} folders deleted.` +
				(processingResult.notDeletedFiles
					? `${processingResult.notDeletedFiles} folders not deleted`
					: ""),
		);
	}

	onunload() {}

	public addIcon() {
		this.removeIcon();
		this.ribbonIconEl = this.addRibbonIcon(
			"trash",
			"Cleaning service: scan files",
			() => {
				void this.scanFiles();
			},
		);
		this.ribbonIconEl.addClass("cleaning-service-ribbon-class");
	}

	public removeIcon() {
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
		}
	}

	async loadSettings() {
		const data = await this.loadData() as Partial<CleaningServiceSettings>;
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			data,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
