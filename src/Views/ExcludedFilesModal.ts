import { App, Modal } from "obsidian";
import { CleaningServiceSettings } from "src/CleaningServiceSettings";
import { getFolders } from "src/Utils";

export class ExcludedFilesModal extends Modal {
	settings: CleaningServiceSettings;
	onFiltersChanged: (filters: string[]) => void;

	private filters: string[];
	private inputValue = "";
	private filterListEl: HTMLElement;
	private inputEl: HTMLInputElement;

	constructor(
		app: App,
		settings: CleaningServiceSettings,
		onFiltersChanged: (filters: string[]) => void,
	) {
		super(app);
		this.settings = settings;
		this.titleEl.setText("Cleaning service excluded files");
		this.onFiltersChanged = onFiltersChanged;
		this.filters = [...(settings.excludedFilesFilters || [])];
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createDiv({
			text: "Files matching the following regular expressions are currently ignored:",
		});

		this.filterListEl = contentEl.createDiv();
		this.renderFilterList();

		const settingItem = contentEl.createDiv({ cls: "setting-item" });

		const infoDiv = settingItem.createDiv({ cls: "setting-item-info" });
		infoDiv.createDiv({ cls: "setting-item-name", text: "Filter" });

		const descEl = infoDiv.createDiv({ cls: "setting-item-description" });
		this.updateDescription(descEl);

		const controlDiv = settingItem.createDiv({ cls: "setting-item-control" });

		this.inputEl = controlDiv.createEl("input", {
			type: "text",
			placeholder: "Insert folder or regex...",
		});
		this.inputEl.addClass("cleaning-service-filter-input");
		this.inputEl.addEventListener("input", () => {
			this.inputValue = this.inputEl.value;
			this.updateDescription(descEl);
		});
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.addFilter();
				this.updateDescription(descEl);
			}
		});

		const addBtn = controlDiv.createEl("button", { text: "Add" });
		addBtn.addEventListener("click", () => {
			this.addFilter();
			this.updateDescription(descEl);
		});

		const dataList = contentEl.createEl("datalist", { attr: { id: "folder-suggestions" } });
		const folders = getFolders(this.app).map((f) => (f.endsWith("/") ? f : f + "/"));
		folders.forEach((f) => {
			dataList.createEl("option", { value: f });
		});
		this.inputEl.setAttr("list", "folder-suggestions");

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
		const doneBtn = buttonContainer.createEl("button", { cls: "mod-cta", text: "Done" });
		doneBtn.addEventListener("click", () => {
			if (this.onFiltersChanged) {
				this.onFiltersChanged(this.filters);
			}
			this.close();
		});

		const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());
	}

	private renderFilterList() {
		this.filterListEl.empty();
		this.filters.forEach((filter, i) => {
			const row = this.filterListEl.createDiv({ cls: "mobile-option-setting-item" });
			row.createSpan({ cls: "mobile-option-setting-item-name", text: filter });

			const icon = row.createSpan({ cls: "mobile-option-setting-item-option-icon" });
			icon.setText("×");
			icon.addEventListener("click", () => {
				this.filters = this.filters.filter((_, index) => i !== index);
				this.renderFilterList();
			});
		});
	}

	private addFilter() {
		if (!isValidRE(this.inputValue)) return;
		this.filters = [...this.filters, this.inputValue];
		this.inputValue = "";
		this.inputEl.value = "";
		this.renderFilterList();
	}

	private updateDescription(el: HTMLElement) {
		const isValid = isValidRE(this.inputValue);
		el.setText(
			isValid
				? "Press enter or button to add filter"
				: "insert a valid regular expression",
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

function isValidRE(value: string) {
	let isValid = value.length > 0;
	try {
		new RegExp(value);
	} catch {
		isValid = false;
	}
	return isValid;
}
