import * as React from "react";
import { inject, observer } from "mobx-react";

import {
	ITrimConnector,
	IObjectDetails,
	IPropertyOrFieldDef,
	ITrimDetailsObject,
} from "../trim-coms/trim-connector";
import { Label } from "office-ui-fabric-react/lib/Label";
import { IOfficeConnector } from "../office-coms/office-connector";

interface IDetailsViewProps {
	appStore?: any;
	trimConnector?: ITrimConnector;
	wordConnector?: IOfficeConnector;
	recordDetails: IObjectDetails;
	trimType: BaseObjectTypes;
	className?: string;
}
import {
	mergeStyles,
	ComboBox,
	DefaultButton,
	Stack,
	IComboBox,
	IComboBoxOption,
	Icon,
	TooltipHost,
	DirectionalHint,
} from "office-ui-fabric-react";
import BaseObjectTypes from "../trim-coms/trim-baseobjecttypes";
import PropertySetTypes from "../trim-coms/PropertySetTypes";

export class DetailsView extends React.Component<
	IDetailsViewProps,
	{
		propertiesAndFields: IPropertyOrFieldDef[];
		propertyAndFieldDefinitions: IPropertyOrFieldDef[];
		keysToAdd: string[];
		recordProperties: ITrimDetailsObject;
		spinning: boolean;
	}
> {
	constructor(props: IDetailsViewProps) {
		super(props);
		let defaultRecordDetails = { Uri: 0 };
		if (props.recordDetails.results && props.recordDetails.results.length > 0) {
			defaultRecordDetails = props.recordDetails.results[0];
		}
		this.state = {
			propertiesAndFields: props.recordDetails.propertiesAndFields || [],
			propertyAndFieldDefinitions: [],
			keysToAdd: [],
			recordProperties: defaultRecordDetails,
			spinning: false,
		};
	}

	componentDidUpdate(prevProps: IDetailsViewProps) {
		const { recordDetails } = this.props;
		const { recordProperties } = this.state;
		if (
			prevProps.recordDetails.propertiesAndFields !==
			recordDetails.propertiesAndFields
		) {
			if (recordDetails.propertiesAndFields) {
				this.setState({
					propertiesAndFields: recordDetails.propertiesAndFields,
				});
			}
		}

		const uri = recordProperties ? recordProperties.Uri : 0;

		if (
			prevProps.recordDetails.results &&
			prevProps.recordDetails.results.length > 0 &&
			uri !== prevProps.recordDetails.results[0].Uri
		) {
			this.setState({ recordProperties: recordDetails.results[0] });
		}
	}

	componentDidMount() {
		this.onMenuOpen();
	}

	private getStyles(): string {
		return mergeStyles({
			selectors: {
				"& .ms-Icon": {
					cursor: "pointer",
				},
				"& .ms-ComboBox-container": {
					marginRight: "6px",
					width: "calc(100% - 60px)",
				},
				"& .ms-sm1": {
					paddingLeft: "0",
					cursor: "pointer",
				},
				span: {
					wordBreak: "break-word",
				},
			},
		});
	}

	private getText(propId: string): any {
		const { recordProperties } = this.state;
		if (recordProperties) {
			if (recordProperties.Uri > 0) {
				const prop = recordProperties[propId];
				if (prop) {
					if (prop.hasOwnProperty("StringValue")) {
						return prop.StringValue;
					}
					return `${prop}`;
				} else {
					const fld = (recordProperties.Fields || {})[propId];
					if (fld) {
						return fld.StringValue;
					}
				}
			}
		}
		return "";
	}

	private addToViewPane = () => {
		const { trimConnector, appStore } = this.props;
		const {
			propertyAndFieldDefinitions,
			propertiesAndFields,
			keysToAdd,
			recordProperties,
		} = this.state;

		const propItems = propertyAndFieldDefinitions.filter((pdef) => {
			return keysToAdd.includes(pdef.Id);
		});

		if (propItems) {
			this.setState({ spinning: true });
			propertiesAndFields.push(...propItems);

			trimConnector!
				.setViewPaneProperties(
					recordProperties,
					propertiesAndFields.map((prop) => {
						return prop.Id;
					})
				)
				.then((newProps: IPropertyOrFieldDef[]) => {
					trimConnector!
						.getObjectDetails(this.getTrimType(), recordProperties.Uri)

						.then((recordDetails) => {
							this.setState({
								propertiesAndFields: newProps,
								recordProperties: recordDetails.results[0],
								spinning: false,
								keysToAdd: [],
							});
						});
				})
				.catch((e) => {
					appStore!.setError(e);
				});
		}
	};

	private _onInsertRecordLink = (propertyId: string) => {
		const { appStore, wordConnector } = this.props;
		const { recordProperties } = this.state;

		const text =
			propertyId === "RecordContainer"
				? recordProperties[propertyId].RecordNumber.Value
				: this.getText(propertyId);

		const link = appStore.getWebClientUrl(
			propertyId === "RecordContainer"
				? recordProperties[propertyId].Uri
				: recordProperties.Uri,
			propertyId === "RecordContainer"
		);
		wordConnector!.insertLink(text, link);
	};

	private _onRemoveFromViewPane = (propertyId: string) => {
		const { trimConnector } = this.props;
		const { propertiesAndFields, recordProperties } = this.state;

		const propItem = propertiesAndFields.find((p) => {
			return p.Id === propertyId;
		});

		if (propItem) {
			const pos = propertiesAndFields.indexOf(propItem);
			let newProps = propertiesAndFields;
			newProps.splice(pos, 1);

			trimConnector!
				.setViewPaneProperties(
					recordProperties,
					newProps.map((prop) => {
						return prop.Id;
					})
				)
				.then((newProps: IPropertyOrFieldDef[]) => {
					this.setState({ propertiesAndFields: newProps });
				});
		}
	};
	private _gettingPropDefs: boolean = false;

	private onMenuOpen = () => {
		if (!this._gettingPropDefs) {
			this._gettingPropDefs = true;
			const { propertyAndFieldDefinitions } = this.state;
			const { trimConnector } = this.props;

			if (propertyAndFieldDefinitions.length < 1) {
				trimConnector!
					.getViewPanePropertyDefs(
						this.getTrimType(),
						PropertySetTypes.ViewPane
					)
					.then((data) => {
						this.setState({
							propertyAndFieldDefinitions: data,
						});
					});
			}
		}
	};

	private getTrimType = () => {
		const { trimType } = this.props;

		return trimType === BaseObjectTypes.CheckinPlace
			? BaseObjectTypes.CheckinStyle
			: trimType;
	};

	private _comboChangePropertyDef = (
		event: React.FormEvent<IComboBox>,
		option?: IComboBoxOption,
		index?: number,
		value?: string
	): void => {
		const currentSelectedKeys = this.state.keysToAdd || [];

		if (option) {
			this.setState({
				keysToAdd: this._updateSelectedOptionKeys(currentSelectedKeys, option),
			});
		}
	};

	private _updateSelectedOptionKeys = (
		selectedKeys: string[],
		option: IComboBoxOption
	): string[] => {
		selectedKeys = [...selectedKeys]; // modify a copy
		const index = selectedKeys.indexOf(option.key as string);
		if (index < 0) {
			selectedKeys.push(option.key as string);
		} else {
			selectedKeys.splice(index, 1);
		}
		return selectedKeys;
	};

	public render() {
		const {
			propertiesAndFields,
			propertyAndFieldDefinitions,
			keysToAdd,
			spinning,
		} = this.state;
		const { appStore, className } = this.props;

		return (
			<React.Fragment>
				<div
					className={
						className ? className : "new-record-body" + " " + this.getStyles()
					}
				>
					<div className="details-view ms-Grid" dir="ltr">
						{propertiesAndFields
							.filter((p) => {
								return (
									p.Id !== "CommandDefs" &&
									p.Id !== "RecordExternalEditingComplete"
								);
							})
							.map((propDef) => {
								const includePaste =
									(propDef.Id === "RecordNumber" ||
										propDef.Id === "RecordContainer") &&
									!appStore.isEmail();

								const pasteEl = (
									<span className="ms-Grid-col ms-sm1 ms-md1 ms-lg1">
										<TooltipHost
											content={appStore.messages.web_Record_Paste_Link}
											calloutProps={{ gapSpace: 0 }}
											directionalHint={DirectionalHint.bottomCenter}
											styles={{ root: { display: "inline-block" } }}
										>
											<Icon
												iconName="Paste"
												onClick={() => {
													this._onInsertRecordLink(propDef.Id);
												}}
												aria-hidden={true}
											/>
										</TooltipHost>
									</span>
								);

								const displayText = this.getText(propDef.Id);

								const textLineWidth = 25;
								return (
									<div key={propDef.Id} className="details-item ms-Grid-row ">
										<Label className="ms-Grid-col ms-sm4 ms-md4 ms-lg2">
											{propDef.Caption}
										</Label>
										<span
											className={
												"ms-Grid-col ms-fontWeight-semibold " +
												(includePaste && displayText.length < textLineWidth
													? "ms-sm6 ms-md6 ms-lg8"
													: "ms-sm7 ms-md7 ms-lg9")
											}
										>
											{displayText}
										</span>
										{includePaste &&
											displayText.length < textLineWidth &&
											pasteEl}

										<span className="ms-Grid-col ms-sm1 ms-md1 ms-lg1">
											<TooltipHost
												content={appStore.messages.web_Remove_From_View_Pane}
												calloutProps={{ gapSpace: 0 }}
												directionalHint={DirectionalHint.bottomCenter}
												styles={{ root: { display: "inline-block" } }}
											>
												<Icon
													iconName="Cancel"
													onClick={() => {
														this._onRemoveFromViewPane(propDef.Id);
													}}
													className="ms-Grid-col ms-sm1 ms-md1 ms-lg1"
													aria-hidden={true}
												/>
											</TooltipHost>
											{includePaste &&
												displayText.length >= textLineWidth &&
												pasteEl}
										</span>
									</div>
								);
							})}
					</div>
					<Stack horizontal={true}>
						<ComboBox
							useComboBoxAsMenuWidth={true}
							selectedKey={keysToAdd}
							onChange={this._comboChangePropertyDef}
							autoComplete="on"
							allowFreeform={true}
							options={propertyAndFieldDefinitions
								.filter((pdef) => {
									return !propertiesAndFields.find(
										(displayedProp) => displayedProp.Id === pdef.Id
									);
								})
								.sort(
									(pdefA: IPropertyOrFieldDef, pdefB: IPropertyOrFieldDef) => {
										if (pdefA.Caption < pdefB.Caption) return -1;
										if (pdefA.Caption > pdefB.Caption) return 1;
										return 0;
									}
								)
								.map((pdef: IPropertyOrFieldDef) => {
									return { key: pdef.Id, text: pdef.Caption };
								})}
							onFocus={this.onMenuOpen}
							disabled={
								!propertyAndFieldDefinitions ||
								propertyAndFieldDefinitions.length === 0
							}
						/>
						<DefaultButton
							disabled={spinning || keysToAdd.length === 0}
							text={appStore.messages.web_Add}
							onClick={this.addToViewPane}
						/>
					</Stack>
				</div>
			</React.Fragment>
		);
	}
}

export default inject(
	"appStore",
	"trimConnector",
	"wordConnector"
)(observer(DetailsView));
