import { App, MarkdownView, Modal } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import CleaningServicePlugin from "../main";

// moment is globally available in Obsidian
declare const moment: {
    (): Moment;
    (date: string, format?: string): Moment;
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
	root!: Root;
	view: MarkdownView;
	date = "";

	constructor(app: App, plugin: CleaningServicePlugin, view: MarkdownView) {
		super(app);
		this.plugin = plugin;
		this.view = view;
		this.date = moment().format("YYYY-MM-DD");
	}

	render() {
		this.root.render(
			<React.StrictMode>
				<div className="cleaning-service-date-picker">
					<form onSubmit={this.onApply.bind(this)}>
						<label>
							<span>Choose a date:</span>
							<input
								type="date"
								value={this.date}
								onChange={this.onDateChange.bind(this)}
							/>
						</label>
						<div className="cleaning-service-date-picker-buttons">
							<button type="button" onClick={(): void => { this.close(); }}>
								Cancel{" "}
							</button>
							<button className="mod-cta" type="submit">
								OK
							</button>
						</div>
						<div className="cleaning-service-date-shortcuts">
							<button
								onClick={(e) =>
									this.dateShortcut(e, 1, "weeks")
								}
								className="cleaning-service-date-shortcut-button"
							>
								In a Week
							</button>
							<button
								onClick={(e) =>
									this.dateShortcut(e, 1, "months")
								}
								className="cleaning-service-date-shortcut-button"
							>
								In a Month
							</button>
							<button
								onClick={(e) =>
									this.dateShortcut(e, 1, "years")
								}
								className="cleaning-service-date-shortcut-button"
							>
								In a Year
							</button>
						</div>
					</form>
				</div>
			</React.StrictMode>,
		);
	}
	dateShortcut(
		e: React.MouseEvent<HTMLButtonElement>,
		n: number,
		what: moment.unitOfTime.DurationConstructor,
	) {
		this.date = moment().add(n, what).format("YYYY-MM-DD");
		this.render();
	}

	onApply(event: React.FormEvent) {
		event.preventDefault();
		const dateToSet = moment(this.date, "YYYY-MM-DD").format(
			this.plugin.settings.expiredDateFormat,
		);
		void this.plugin.updateNoteWithDate(this.view, dateToSet);
		this.close();
		return false;
	}

	onDateChange(event: React.ChangeEvent<HTMLInputElement>) {
		this.date = event.target.value;
		this.render();
	}

	onOpen() {
		const { contentEl } = this;
		this.root = createRoot(contentEl) as unknown as Root;
		this.render();
	}

	onClose() {
		this.root.unmount();
	}
}
