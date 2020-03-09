var pdfkit = require('pdfkit');
var fs = require('fs');
var Q = require('q');
var path = require('path');

var pdf_base_folder = "/usr/local/apache2/goingnowhere/art/data/register"

var artTypeMap = {
	'car': 'Art Car / Moving installation',
	'installation': 'Installation / Land Art',
	'workshop': 'Workshop / Talk',
	'performance': 'Performance / Live'
}

function exists(path) {
	try {
	 	fs.accessSync(path, fs.F_OK);
		return true;
	} catch (e) { return false; }
}

exports.create = function(data, now) {
	var deferred = Q.defer()
	// FIXME: Ideally we want to refactor all these utility functions so that they live outside of
	// the exported method.

	function startSection(title, text, headerSize) {
		headerSize = headerSize || 14
		text = text || ""

		pdf.text(" ")

		pdf.fontSize(headerSize)
		pdf.text(title)

		pdf.fontSize(10)
		if (text) {
			// Hack necessary until this bug is fixed: https://github.com/devongovett/pdfkit/issues/440
			text.split("\n").forEach(function(line) { pdf.text(line) })
		}
	}

	function startSectionIf(header, text) { if (text) startSection(header, text) }

	function headerText(header, text) {
		// Hack necessary until this bug is fixed: https://github.com/devongovett/pdfkit/issues/440
		var texts = text.split("\n")
		pdf.text(header, { underline: true, continued: true })
		   .text(": " + texts[0], { underline: false })
		for (var i = 1; i < texts.length; i++) pdf.text(texts[i])
	}

	function checkbox(label, value) { headerText(label, value) } // ? "Yes" : "No") }
	function headerTextIf(header, text, alternate) {
		if (text) headerText(header, text)
		else if (alternate) headerText(header, alternate)
	}

	var pdf = new pdfkit();
	pdf.image('server/logo.png', (pdf.page.width - 480 ) / 2, 0, { width: 480 })
	pdf.font('Helvetica')
	pdf.fontSize(18)
	pdf.text(" ")
	pdf.text("Nowhere " + now.format("YYYY") + " - Art Registration");
	pdf.fontSize(16)
	startSection("Submission for: " + data["art-title"] + " by " + data["artist-name"])

	pdf.text(" ")
	headerText("Submission date", now.format('LLL'))
	headerText("Art type", artTypeMap[data["art-type"]])
	headerText("Public description", "\n" + data["art-description"])

	switch (data['art-type']) {
	case "car":
		startSectionIf("Art car details", data['car-details']);
		break;
	case "workshop":
	case "performance":
		var isWorkshop = data['art-type'] == "workshop";
		startSection(isWorkshop ? "Workshop details" : "Performance details", data['performance-overview'])
		pdf.text(" ")
		headerText("Duration (approximate)", data['performance-duration'])
		headerText("Frequency", data['performance-frequency'])
		headerTextIf("Preferred time of day", data['performance-timeofday'], "Not specified")
		headerTextIf("Equipment, safety and logistics", data['performance-equipment'])
		break;
	case "installation":
		startSection("Installation details", data['install-overview'] + "\n")
		pdf.text(" ")
		headerText("Measurements", data['install-size-x'] + "x" + data['install-size-y'] +
			       " meters (height: " + data['install-height'] + ')')
		headerText("Regulations", "You have agreed to respect local regulations, especially those concerning fire.")
		headerText("Responsibility", "You have agreed to take full responsiblity for your installattion and any damage that may result from it.")
		headerTextIf("Other potential risks", data['install-safety-other'])
		headerTextIf("Placement preference", data['install-placement-preferences'], "No preference")
		if (data['install-power']) {
			headerText("Required power", data['install-power-watts'] + " Watts")
			headerText("Details of powered equipment", data['install-power-devices'])
		} else {
			headerText("Power", "not required, or self powered")
		}
		break;
	}

	if (data['art-funding']) {
		startSection("Funding")
		headerText("Requested amount", data['fund-request'] + " EUR")
		headerText("Total expected cost", data['fund-total'] + " EUR")
		headerTextIf("How will you raise additional funds?", "\n" + data['fund-raise'])
		headerText("Budget outline", "\n" + data['fund-budget'])
		headerTextIf("Plan outline", "\n" + data['fund-plan-a'])
		headerTextIf("Alternative plan", data['fund-plan-b'])
	}

	startSection("Artist information")
	pdf.text(data['contact-name'] + " <" + data['contact-email'] + ">" +
			 (data['contact-phone'] ? " phone: " + data['contact-phone'] : ""))
	headerTextIf("From", data["artist-nationality"])
	headerTextIf("Introduction", data['artist-introduction'])
	checkbox("First time at Nowhere ? ", data['artist-first-time'])
	headerTextIf("Previous experience", data['artist-other-burns'])

	clean_title = data['art-title'].replace(/[^a-z0-9]/ig, "_")
	clean_artist = data['artist-name'].replace(/[^a-z0-9]/ig, "_")

	var tmp_path = "/tmp/art-registration-" + now.format("YYYY_MM_DD_HH_mm_ss_SSS") + ".pdf"
	var perm_path = path.join("pdf", now.format("YYYY") + "-" + clean_title + "-" + clean_artist + ".pdf");
	var stream = fs.createWriteStream(tmp_path)
	pdf.pipe(stream)
	pdf.end()

	stream.on('finish', function() {
		var ret = { tmp: tmp_path, perm: perm_path};
		fs.chmodSync(tmp_path, "666");
		try { fs.copyFileSync(tmp_path, path.join(pdf_base_folder, perm_path)); }
		catch (e) {
		    /* that's OK, we will attach it to the email anyway */
		    ret.error = e;
		}
		deferred.resolve(ret);
	})

	return deferred.promise
}
