﻿// The initialize function must be run each time a new page is loaded.
(function () {
	Office.initialize = function (reason) {
		// If you need to initialize something you can do so here.
		//  loadProps();
	};
})();

let accessToken = "";

function loadProps() {
	var dfd = jQuery.Deferred();

	if (Office.context.requirements.isSetSupported("IdentityAPI", 1.1)) {
		OfficeRuntime.auth
			.getAccessToken({ allowSignInPrompt: true, forMSGraphAccess: true })
			.then(function (token) {
				accessToken = token;
				dfd.resolve("success");
			})
			.catch(function (error) {
				console.log(error);
				// alert(result.error)
				if (result.error.code === 13003) {
					// SSO is not supported for domain user accounts, only
					// work or school (Office 365) or Microsoft Account IDs.
				} else {
					// Handle error
				}
				dfd.resolve("error");
			});
	}

	return dfd.promise();
}

function getRoot() {
	let appPath = config.MY_PATH;

	let root = location.origin.endsWith("/")
		? location.origin
		: location.origin + "/";

	if (appPath.startsWith("/")) {
		appPath = appPath.substr(1);
	}
	root = root + (appPath.startsWith("/") ? appPath.slice(1) : appPath);

	root = root.endsWith("/") ? root : root + "/";

	return root;
}

function openHelp(event) {
	const root = getRoot();

	open(root + "home/help.html", "_help");
	event.completed();
}

function openOutlookHelp(event) {
	const root = getRoot();

	open(root + "home/outlook_help.html", "_help");
	event.completed();
}

let dialog;

function insertObjectFromTrim(event) {
	const fn = function (args) {
		if (args.message !== "0") {
			// Run a batch operation against the Word object model.
			Word.run(function (context) {
				// Queue a command to get the current selection and then
				// create a proxy range object with the results.
				var range = context.document.getSelection();

				// Queue a commmand to delete the range object.
				range.insertFileFromBase64(args.message, "Replace");

				// Synchronize the document state by executing the queued commands,
				// and return a promise to indicate task completion.
				return context.sync().then(function () {
					console.log("Inserting text");
				});
			}).catch(function (error) {
				console.log("Error: " + JSON.stringify(error));
				if (error instanceof OfficeExtension.Error) {
					console.log("Debug info: " + JSON.stringify(error.debugInfo));
				}
			});
		}
		dialog.close();
	};

	const extensions = "docx";

	doOpen(
		event,
		"recExtension:" +
			extensions +
			" OR recContainsEx:[recExtension:" +
			extensions +
			"]",
		true,
		fn
	);
}

function insertTextFromTrim(event) {
	const fn = function (args) {
		if (args.message !== "0") {
			if (Office.context.host === Office.HostType.Word) {
				Word.run(function (context) {
					// Queue a command to get the current selection and then
					// create a proxy range object with the results.
					var range = context.document.getSelection();

					// Queue a commmand to delete the range object.
					if (args.message.substr(0, 6).toLowerCase().startsWith("<html>")) {
						range.insertHtml(args.message, "Replace");
					} else {
						range.insertText(args.message, "Replace");
					}
					// Synchronize the document state by executing the queued commands,
					// and return a promise to indicate task completion.
					return context.sync().then(function () {
						console.log("Inserting text");
					});
				}).catch(function (error) {
					console.log("Error: " + JSON.stringify(error));
					if (error instanceof OfficeExtension.Error) {
						console.log("Debug info: " + JSON.stringify(error.debugInfo));
					}
				});
			}
			if (Office.context.host === Office.HostType.Excel) {
				Excel.run(function (context) {
					// Queue a command to get the current selection and then
					// create a proxy range object with the results.
					const range = context.workbook.getSelectedRange();
					range.values = [[args.message]];
					range.format.autofitColumns();

					// Synchronize the document state by executing the queued commands,
					// and return a promise to indicate task completion.
					return context.sync().then(function () {
						console.log("Inserting picture");
					});
				}).catch(function (error) {
					console.log("Error: " + JSON.stringify(error));
					if (error instanceof OfficeExtension.Error) {
						console.log("Debug info: " + JSON.stringify(error.debugInfo));
					}
				});
			}
		}
		dialog.close();
	};

	const extensions = "txt,log,csv,1st,html,lst,md,text,xml";

	doOpen(
		event,
		"recExtension:" +
			extensions +
			" OR recContainsEx:[recExtension:" +
			extensions +
			"]",
		true,
		fn
	);
}

function insertPictureFromTrim(event) {
	const fn = function (args) {
		if (args.message !== "0") {
			if (Office.context.host === Office.HostType.Word) {
				Word.run(function (context) {
					// Queue a command to get the current selection and then
					// create a proxy range object with the results.
					var range = context.document.getSelection();

					// Queue a command to delete the range object.
					range.insertInlinePictureFromBase64(args.message, "Replace");

					// Synchronize the document state by executing the queued commands,
					// and return a promise to indicate task completion.
					return context.sync().then(function () {
						console.log("Inserting picture");
					});
				}).catch(function (error) {
					console.log("Error: " + JSON.stringify(error));
					if (error instanceof OfficeExtension.Error) {
						console.log("Debug info: " + JSON.stringify(error.debugInfo));
					}
				});
			}
		}
		dialog.close();
	};
	const extensions = "ai,bmp,gif,ico,png,ps,psd,jpeg,tif,tiff,jpg";

	doOpen(
		event,
		"recExtension:" +
			extensions +
			" OR recContainsEx:[recExtension:" +
			extensions +
			"]",
		true,
		fn
	);
}

function openFromTrim(event) {
	let openUrl = "";
	const fn = function (args) {
		dialog.close();
		if (args.message === "0") {
			dialog.close();
		} else {
			openUrl = args.message;

			const response = JSON.parse(openUrl);

			try {
				dialog.close();
			} finally {
				if (!response.UserHasAccess) {
					noAccessMsg(response.WebUrl);
				} else if (Office.context.diagnostics.platform === "PC") {
					let app = (function () {
						switch (Office.context.host) {
							case Office.HostType.Excel:
								return "excel";
							case Office.HostType.Word:
								return "word";
							case Office.HostType.PowerPoint:
								return "powerpoint";
							case Office.HostType.Access:
								return "access";
							case Office.HostType.Project:
								return "project";
						}

						throw new Exception("Application not supported.");
					})();

					window.open(`ms-${app}:ofe|u|` + response.WebDavUrl, "_blank");
				} else {
					openDocMsg(response.WebUrl);
				}
			}
		}
	};

	let extensions = "docx,docm,odt";

	if (Office.context.host === Office.HostType.Excel) {
		extensions = "xlsx";
	}

	if (Office.context.host === Office.HostType.PowerPoint) {
		extensions = "pptx";
	}

	doOpen(
		event,
		"recExtension:" +
			extensions +
			" OR recContainsEx:[recExtension:" +
			extensions +
			"]",
		false,
		fn
	);
}

function doOpen(event, filter, insertText, fn, fnEv) {
	$.when(loadProps()).then(function (status) {
		if (status === "success") {
			const root = getRoot();
			let insertTextQ = "";
			if (insertText) {
				insertTextQ = "&insert=true";
			}

			Office.context.ui.displayDialogAsync(
				root +
					"?searchdialog=true&accessToken=" +
					accessToken +
					"&rnd=" +
					Math.random() +
					"&filter=" +
					filter +
					insertTextQ,
				{ height: 64, width: 50, displayInIframe: true },
				function (asyncResult) {
					dialog = asyncResult.value;
					dialog.addEventHandler(Office.EventType.DialogMessageReceived, fn);

					if (fnEv) {
						dialog.addEventHandler(Office.EventType.DialogEventReceived, fnEv);
					}
				}
			);
			event.completed();
		} else {
			event.completed();
		}
	});

	// function processCreateMessage(args) {
	// 	if (args.message !== "0") {
	// 		open(args.message, "_blank");
	// 	}
	// 	dialog.close();
	// }
}

function noAccessMsg(url) {
	const root = getRoot();

	const fullUrl = root + "home/dialog.html?goTo=" + url;

	// I wait for half a second otherwise I get an error that another dialog is already open

	setTimeout(function () {
		Office.context.ui.displayDialogAsync(
			fullUrl,
			{
				height: 55,
				width: 50,
				displayInIframe: false,
				promptBeforeOpen: false,
			},
			function (asyncResult) {
				if (asyncResult.status === Office.AsyncResultStatus.Failed) {
					console.log(
						(asyncResult.error.code = ": " + asyncResult.error.message)
					);
				} else {
					dialog = asyncResult.value;
					dialog.addEventHandler(
						Office.EventType.DialogMessageReceived,
						function () {}
					);
				}
			}
		);
	}, 500);
}

function openDocMsg(url) {
	const root = getRoot();

	const fullUrl = root + "home/openDoc.html?goTo=" + url;
	console.log(fullUrl);
	// I wait for half a second otherwise I get an error that another dialog is already open

	setTimeout(function () {
		Office.context.ui.displayDialogAsync(
			fullUrl,
			{
				height: 55,
				width: 50,
				displayInIframe: false,
				promptBeforeOpen: false,
			},
			function (asyncResult) {
				if (asyncResult.status === Office.AsyncResultStatus.Failed) {
					console.log(
						(asyncResult.error.code = ": " + asyncResult.error.message)
					);
				} else {
					dialog = asyncResult.value;
					dialog.addEventHandler(
						Office.EventType.DialogMessageReceived,
						function () {}
					);
				}
			}
		);
	}, 500);
}
