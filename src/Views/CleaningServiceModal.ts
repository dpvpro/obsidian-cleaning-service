import { App, Modal } from "obsidian";
import { ScanResults } from "../FileScanner";
import CleaningServicePlugin from "../main";
import { OperationType } from "../CleaningServiceSettings";

interface SelectableItem {
	selected: boolean;
	name: string;
}

type AppWithDefaultApp = App & {
	openWithDefaultApp: (path: string) => Promise<void>;
};

export class CleaningServiceModal extends Modal {
	plugin: CleaningServicePlugin;

	private orphans: SelectableItem[] | false = false;
	private empty: SelectableItem[] | false = false;
	private big: SelectableItem[] | false = false;
	private expired: SelectableItem[] | false = false;
	private emptyDirectories: SelectableItem[] | false = false;
	private scanning = true;

	private contentArea: HTMLElement;
	private footerBtns: HTMLButtonElement[];

	constructor(app: App, plugin: CleaningServicePlugin) {
		super(app);
		this.plugin = plugin;
	}

	perform(operation: OperationType) {
		const files = this.extractFiles();
		const folders = this.extractDirectories();
		void this.plugin.perform(operation, files);
		if (folders.length > 0) {
			void this.plugin.performOnDirectories(operation, folders);
		}
		this.close();
	}

	private onPerform(operation: OperationType) {
		void this.perform(operation);
	}

	private async handleOpen(ic: number, items: SelectableItem[]) {
		const item = items[ic];
		if (item) {
			await (this.app as AppWithDefaultApp).openWithDefaultApp(item.name);
		}
	}

	private allSections(): Array<{ key: string; items: SelectableItem[] | false; title: string }> {
		return [
			{ key: "orphans", items: this.orphans, title: "Orphans" },
			{ key: "empty", items: this.empty, title: "Empty" },
			{ key: "expired", items: this.expired, title: "Expired" },
			{ key: "big", items: this.big, title: "Big" },
			{ key: "emptyDirectories", items: this.emptyDirectories, title: "Empty Folders" },
		];
	}

	private somethingSelected(): boolean {
		return this.allSections().some((s) => s.items && s.items.some((i) => i.selected));
	}

	private getItems(key: string): SelectableItem[] | false {
		switch (key) {
			case "orphans": return this.orphans;
			case "empty": return this.empty;
			case "expired": return this.expired;
			case "big": return this.big;
			case "emptyDirectories": return this.emptyDirectories;
		}
		return false;
	}

	private setItems(key: string, items: SelectableItem[] | false) {
		switch (key) {
			case "orphans": this.orphans = items; break;
			case "empty": this.empty = items; break;
			case "expired": this.expired = items; break;
			case "big": this.big = items; break;
			case "emptyDirectories": this.emptyDirectories = items; break;
		}
	}

	private updateFooterButtons() {
		const hasSelection = this.somethingSelected();
		this.footerBtns.forEach((btn) => {
			btn.toggleClass("is-visible", hasSelection);
		});
	}

	handleSelectionChange(ic: number, section: string) {
		const items = this.getItems(section);
		if (!items) return;

		if (ic >= 0) {
			items[ic].selected = !items[ic].selected;
		} else {
			const allSelected = items.every((f) => f.selected);
			items.forEach((f) => (f.selected = !allSelected));
		}
		this.updateFooterButtons();
		this.updateSectionCheckboxes(section);
	}

	private updateSectionCheckboxes(section: string) {
		const items = this.getItems(section);
		if (!items) return;

		const wrapper = this.contentArea.querySelector(
			`.cleaning-service-files-wrapper[data-section="${section}"]`,
		) as HTMLElement;
		if (!wrapper) return;

		const selectAllCheckbox = wrapper.querySelector(".select-all-checkbox") as HTMLInputElement;
		const counterEl = wrapper.querySelector(".section-counter") as HTMLElement;
		const fileCheckboxes = wrapper.querySelectorAll<HTMLInputElement>(".file-checkbox");

		const allSelected = items.every((f) => f.selected);
		const numSelected = items.filter((f) => f.selected).length;

		if (selectAllCheckbox) selectAllCheckbox.checked = allSelected;
		if (counterEl) {
			counterEl.setText(numSelected > 0 ? ` (${numSelected} selected)` : "");
		}
		fileCheckboxes.forEach((cb, i) => {
			cb.checked = items[i]?.selected ?? false;
		});
	}

	public updateState(results: ScanResults) {
		this.scanning = results.scanning;
		this.orphans = results.orphans ? results.orphans.map((f) => ({ name: f.path, selected: false })) : false;
		this.empty = results.empty ? results.empty.map((f) => ({ name: f.path, selected: false })) : false;
		this.expired = results.expired ? results.expired.map((f) => ({ name: f.path, selected: false })) : false;
		this.big = results.big ? results.big.map((f) => ({ name: f.path, selected: false })) : false;
		this.emptyDirectories = results.emptyDirectories
			? results.emptyDirectories.map((p) => ({ name: p, selected: false }))
			: false;

		this.renderResults();
	}

	private renderResults() {
		this.contentArea.empty();

		if (this.scanning) {
			this.contentArea.createEl("h4", { text: "Scanning..." });
			return;
		}

		const resultsDiv = this.contentArea.createDiv({ cls: "cleaning-service-scan-results" });

		for (const section of this.allSections()) {
			if (!section.items || section.items.length === 0) continue;

			const wrapper = resultsDiv.createDiv({ cls: "cleaning-service-files-wrapper" });
			wrapper.dataset.section = section.key;

			const allSelected = section.items.every((f) => f.selected);
			const numSelected = section.items.filter((f) => f.selected).length;

			const titleDiv = wrapper.createDiv({ cls: "cleaning-service-scan-section-title" });
			const label = titleDiv.createEl("label", {
				title: `Click to ${allSelected ? "unselect" : "select"} these ${section.items.length} items`,
			});

			const selectAllCheckbox = label.createEl("input", { type: "checkbox" });
			selectAllCheckbox.className = "select-all-checkbox";
			selectAllCheckbox.checked = allSelected;

			const sectionKey = section.key;
			selectAllCheckbox.addEventListener("change", () => {
				this.handleSelectionChange(-1, sectionKey);
			});

			label.appendText(`${section.title} (${section.items.length} items)`);

			const counterSpan = label.createSpan({ cls: "section-counter" });
			if (numSelected > 0) {
				counterSpan.setText(` (${numSelected} selected)`);
			}

			section.items.forEach((file, i) => {
				const fileDiv = wrapper.createDiv({ cls: "cleaning-service-file" });
				const fileLabel = fileDiv.createEl("label");

				const checkbox = fileLabel.createEl("input", { type: "checkbox" });
				checkbox.className = "file-checkbox";
				checkbox.checked = file.selected;
				checkbox.value = file.name;

				const fileIndex = i;
				checkbox.addEventListener("change", () => {
					this.handleSelectionChange(fileIndex, sectionKey);
				});

				fileLabel.createSpan({ text: file.name });

				const openLink = fileLabel.createEl("a", { href: "#", cls: "openFileIcon", text: "Open" });
				openLink.addEventListener("click", (e) => {
					e.preventDefault();
					const sectionItems = section.items as SelectableItem[];
				void this.handleOpen(fileIndex, sectionItems);
				});
			});
		}

		this.updateFooterButtons();
	}

	onOpen() {
		const { contentEl } = this;

		const modalEl = (this as unknown as { modalEl: HTMLElement }).modalEl;
		if (modalEl) {
			modalEl.addClass("mod-wide");
			modalEl.addClass("cleaning-service-modal");
		}

		const wrapper = contentEl.createDiv({ cls: "cleaning-service-modal-wrapper" });

		wrapper.createDiv({ cls: "cleaning-service-modal-title", text: "Cleaning Service Scan Results" });

		this.contentArea = wrapper.createDiv({ cls: "cleaning-service-modal-content" });

		if (this.scanning) {
			this.contentArea.createEl("h4", { text: "Scanning..." });
		}

		const footer = wrapper.createDiv({ cls: "cleaning-service-modal-footer" });
		const btnContainer = footer.createDiv({ cls: "cleaning-service-footer-buttons" });

		const trashBtn = btnContainer.createEl("button", { text: "Trash (Obsidian)" });
		trashBtn.tabIndex = 1;
		trashBtn.title = "Put files in the Obsidian .trash";
		trashBtn.addClass("cleaning-service-action-btn");
		trashBtn.addEventListener("click", () => this.onPerform(OperationType.Trash));

		const trashSysBtn = btnContainer.createEl("button", { text: "Trash (system)" });
		trashSysBtn.tabIndex = 1;
		trashSysBtn.title = "Put files in the system trash";
		trashSysBtn.addClass("cleaning-service-action-btn");
		trashSysBtn.addEventListener("click", () => this.onPerform(OperationType.TrashSystem));

		const deleteBtn = btnContainer.createEl("button", { text: "Delete" });
		deleteBtn.tabIndex = 1;
		deleteBtn.title = "Permanently delete files";
		deleteBtn.addClass("cleaning-service-action-btn");
		deleteBtn.addEventListener("click", () => this.onPerform(OperationType.Delete));

		const cancelBtn = btnContainer.createEl("button", { cls: "mod-cta", text: "Cancel" });
		cancelBtn.tabIndex = 1;
		cancelBtn.addEventListener("click", () => this.close());

		this.footerBtns = [trashBtn, trashSysBtn, deleteBtn];
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	extractFiles(): string[] {
		return [
			this.orphans,
			this.empty,
			this.big,
			this.expired,
		].flatMap((list) =>
			list ? list.filter((f) => f.selected).map((f) => f.name) : [],
		);
	}

	extractDirectories(): string[] {
		return this.emptyDirectories
			? this.emptyDirectories.filter((f) => f.selected).map((f) => f.name)
			: [];
	}
}
