import React, { useCallback } from "react";
import { ActionMeta, InputActionMeta, StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";

export type SelectObsProps = {
	options: Array<{ value: string; label: string }>;
	placeholder?: string;
	container?: HTMLElement;
	newLabel: string;
	value: string;
	onChange?: (newValue: unknown, actionMeta: ActionMeta<unknown>) => void;
	onInputChange?: (newValue: unknown, actionMeta: InputActionMeta) => void;
};

export const SelectObs = ({
	options,
	placeholder,
	container,
	onChange,
	onInputChange,
	newLabel,
	value,
}: SelectObsProps) => {
	const createLabelCb = useCallback(
		(value: string) => createLabel({ value, label: newLabel }),
		[newLabel],
	);

	return (
		<CreatableSelect
			options={options}
			formatCreateLabel={createLabelCb}
			inputValue={value}
			onChange={onChange}
			onInputChange={onInputChange}
			styles={customStyles}
			isClearable={true}
			placeholder={placeholder}
			controlShouldRenderValue={false}
			menuPortalTarget={container}
		/>
	);
};

const createLabel = ({ value, label }: { label: string; value: string }) => {
	return <span>{label.replace("{0}", value)}</span>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const customStyles: StylesConfig<any, false, any> = {
	option: (provided: any, state: any) => ({
		...provided,
		background: state.isFocused
			? "var(--background-secondary)"
			: "var(--background-primary)",
		color: "var(--text-normal)",
	}),
	valueContainer: (provided: any) => ({
		...provided,
		padding: "0 6px",
	}),
	menu: (provided: any) => ({
		...provided,
	}),
	menuList: (provided: any) => ({
		...provided,
		background: "var(--background-primary)",
		padding: 0,
		color: "var(--text-normal)",
	}),
	input: (provided: any) => ({
		...provided,
		color: "var(--text-normal)",
	}),
	singleValue: (provided: any) => ({
		...provided,
		color: "var(--text-normal)",
	}),
	control: (provided: any) => ({
		...provided,
		background: "var(--background-modifier-form-field)",
		color: "var(--text-normal)",
		border: "1px solid var(--background-modifier-border)",
		boxShadow: "none",
		width: "300px",
	}),
	menuPortal: (base: any) => ({
		...base,
		zIndex: "var(--layer-modal)",
	}),
};
/* eslint-enable @typescript-eslint/no-explicit-any */
