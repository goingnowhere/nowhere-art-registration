var sheet_id = "118ipgDJ8HKR1Pkv5bZOrS718_PQPz7gGVXY6-LQOn7w"
var key = require('./credentials.json');
var baseURL = "http://www.goingnowhere.org/art/register/"

var GoogleSpreadsheet = require("google-spreadsheet");
var Q = require('q');
var moment = require('moment');
var fs = require('fs');
var nodemailer = require("nodemailer");
var nodemailer_smtp = require("nodemailer-smtp-transport");
var pdf = require('./create-pdf.js')

function saveToSpreadsheet(data) {
	var deferred = Q.defer();
	var sheet = new GoogleSpreadsheet(sheet_id);
	if (sheet == null) { deferred.reject("ERR_OPEN_SHEET"); return deferred.promise; }

	sheet.useServiceAccountAuth(key, function(err) {
		if (err) return deferred.reject("ERR_AUTH:" + err);
		//console.log("Auth successful");

		sheet.getInfo(function(err, sheet_info){
			if (err) return deferred.reject("ERR_NO_SHEET_INFO:" + err);	
			//console.log("Sheet loaded:" + sheet_info.title);
			
			var sheet1 = sheet_info.worksheets[0]
			
			if (sheet1) sheet1.addRow(data, function(err, row) { 
				if (err) return deferred.reject("ERR_SAVE_DATA:" + err);
				//console.log("Row added", row);

				return deferred.resolve();
			})
			else return deferred.reject("ERR_WORKSHEET_NOT_FOUND");
		})
	})

	return deferred.promise;
}

function exists(path) {
	try {
	 	fs.accessSync(path, fs.F_OK);
		return true;
	} catch (e) { return false; }
}

function writeToJSONFile(data, name) {
	if (!exists("submissions")) fs.mkdirSync("submissions");
	try {
		// FIXME: write with permissions so that others than www:www can write/delete
		fs.writeFileSync("submissions/" + name + ".json", JSON.stringify(data));
		return true;
	} catch (e) {
		return false;
	}
}

function sendEmail(data, attach) {
	var deferred = Q.defer();

	var body = fs.readFileSync("server/emailTemplate.txt", 'UTF-8');
	body = body.replace("{{{DOWNLOAD}}}", baseURL + attach);
	body = body.replace("{{{NAME}}}", data['contact-name']);

	// Use local SMTP server (localhost:25), which does not require any authentication
	// (secure: false) and uses a self-signed certificate (tls: rejectUnauthorized: false)
	var smtp = nodemailer.createTransport(nodemailer_smtp({
		secure: false,
	    tls: { rejectUnauthorized: false }
	}));

	smtp.sendMail({
	    from: 'Nowhere Art Team <art@goingnowhere.org>',
	    to: data['contact-email'],
	    bcc: 'ugo@goingnowhere.org',
	    subject: 'You art registration for Nowhere 2016: ' + data['art-title'],
	    text: body,
	    attachments: [{
            filename: "art-registration.pdf",  // filename for the user
            content: fs.readFileSync(attach),
            contentType: "application/pdf"
        }]
	}, function(error, response) {
	   if (error) deferred.reject(error);
	   else deferred.resolve(response);
	});
	return deferred.promise;
}

exports.processRequest = function(request, response) {
	var now = moment(new Date());
	now.locale('en-GB');
	request.form['timestamp'] = now.format('YYYY-MM-DD HH:mm');

	writeToJSONFile(request.form, now.format("YYYY_MM_DD_HH_mm_ss_SSS") + ".json");
	
	saveToSpreadsheet(request.form).then(
		function(row) { response.write("Success !"); response.end(); },
		function(err) { response.write("Error !"); response.end(); }
	)

	var pdfPath = pdf.create(request.form, now).then(function(pdfPath) {
		sendEmail(request.form, pdfPath).then(
			function(retval) { response.write("EMAIL SUCCESS:" + retval)},
			function(error) { response.write("EMAIL FAIL:" + error)}
		)

		var html = fs.readFileSync('server/thankyou.htm', 'UTF-8')
		html = html.replace("{{{MESSAGE}}}", 
			"<h1>Thanks for registering your art !</h1>" +
			"<p>A copy of your submission has been emailed to you (please check your spam folder too, sometimes it ends up there).</p>" +
			"<p>You can also <b><a target='_blank' href='" + pdfPath + "''>download a copy here</a></b> if you want.</p>"
		)
		response.write(html)
	})
};


// <h2>Epic Fail !</h2>
// <p>We are very sorry ! We tried to save the information you submitted but something really bad happened and we could not store it anywhere.</p>
// <p>Because of this we are printing it here, so you do not have to type it again.</p>
// <p>Please copy the following block and send it to art@goingnowhere.org and we will fix this.</p>
// <pre>
