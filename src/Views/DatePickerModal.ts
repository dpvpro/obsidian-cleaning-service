import { App, MarkdownView, Modal } from "obsidian";
import CleaningServicePlugin from "../main";

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

export class DatePickerModal extends Modal {
	plugin: CleaningServicePlugin;
	view: MarkdownView;
	date: string;
	dateInput: HTMLInputElement;

	constructor(app: App, plugin: CleaningServicePlugin, view: MarkdownView) {
		super(app);
		this.plugin = plugin;
		this.view = view;
		this.date = moment().format("YYYY-MM-DD");
	}

	onOpen() {
		const { contentEl } = this;

		const container = contentEl.createDiv({ cls: "cleaning-service-date-picker" });
		const form = container.createEl("form");

		const label = form.createEl("label");
		label.createSpan({ text: "Choose a date:" });
		this.dateInput = label.createEl("input", { type: "date" });
		this.dateInput.value = this.date;
		this.dateInput.addEventListener("change", () => {
			this.date = this.dateInput.value;
		});

		const buttonsDiv = form.createDiv({ cls: "cleaning-service-date-picker-buttons" });
		const cancelBtn = buttonsDiv.createEl("button", { type: "button", text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		buttonsDiv.createEl("button", { cls: "mod-cta", type: "submit", text: "OK" });

		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const dateToSet = moment(this.date, "YYYY-MM-DD").format(
				this.plugin.settings.expiredDateFormat,
			);
			void this.plugin.updateNoteWithDate(this.view, dateToSet);
			this.close();
		});

		const shortcutsDiv = form.createDiv({ cls: "cleaning-service-date-shortcuts" });
		this.addShortcut(shortcutsDiv, "In a Week", 1, "weeks");
		this.addShortcut(shortcutsDiv, "In a Month", 1, "months");
		this.addShortcut(shortcutsDiv, "In a Year", 1, "years");
	}

	private addShortcut(
		parent: HTMLElement,
		label: string,
		n: number,
		unit: moment.unitOfTime.DurationConstructor,
	) {
		const btn = parent.createEl("button", {
			cls: "cleaning-service-date-shortcut-button",
			text: label,
		});
		btn.addEventListener("click", () => {
			this.date = moment().add(n, unit).format("YYYY-MM-DD");
			this.dateInput.value = this.date;
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
