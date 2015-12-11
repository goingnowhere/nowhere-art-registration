var sheet_id = "118ipgDJ8HKR1Pkv5bZOrS718_PQPz7gGVXY6-LQOn7w"
var key = require('./credentials.json');

var GoogleSpreadsheet = require("google-spreadsheet");
var Q = require('q');

function saveToSpreadsheet(data) {
	var deferred = Q.defer();
	var sheet = new GoogleSpreadsheet(sheet_id);
	if (sheet == null) { deferred.reject("ERR_OPEN_SHEET"); return deferred.promise; }

	sheet.useServiceAccountAuth(key, function(err) {
		if (err) return deferred.reject("ERR_AUTH:" + err);
		console.log("Auth successful");

		sheet.getInfo(function(err, sheet_info){
			if (err) return deferred.reject("ERR_NO_SHEET_INFO:" + err);	
			console.log("Sheet loaded:" + sheet_info.title);
			
			var sheet1 = sheet_info.worksheets[0]
			
			if (sheet1) sheet1.addRow(data, function(err, row) { 
				if (err) return deferred.reject("ERR_SAVE_DATA:" + err);
				console.log("Row added", row);

				return deferred.resolve();
			})
			else return deferred.reject("ERR_WORKSHEET_NOT_FOUND");
		})
	})

	return deferred.promise;
}

exports.processRequest = function(request, response) {
	response.write("OK")
	response.write(request.headers)
	response.write(request.form)

	saveToSpreadsheet(request.form).then(
		function(row) { response.write("Success !"); response.end(); },
		function(err) { response.write("Error !"); response.end(); }
	)
};


/*

<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL ^ E_NOTICE);

// Initialize all checkboxes to "no", as they don't exist in the
// $_POST array if they are not checked
$all = array(
"install-safety-night" => "no",
"install-safety-falls" => "no",
"install-safety-fire" => "no",
"lnt-agree" => "no",
"art-funding" => "no",
"user-been-nowhere" => "no"
);

$all["timestamp"] = date("Y-m-d H:i:s");

foreach ($_POST as $key=>$val) {
	//print($key . ",");
	$all[$key] = "$val";
}

function saveDataToFile($data) {
	file_put_contents("submissions/" . $data["timestamp"] . "_" . md5($data["contact-email"]) . ".json",
					  json_encode($data), FILE_APPEND);
}

function emailData($data) {
	// Email message to arts teams
	$from = "forms@goingnowhere.org";
	$destination = "nerochiaro@gmail.com";
	$subject="Art Grant from " . $data["artist-name"] . " : " . $data["art-title"];
	$body = json_encode($data);
	$mailbody ="$body";
	$headers  = "From: ".$from."\r\n";
	$headers .= "Reply-To: ".$data["contact-email"]."\r\n";
	mail($destination, $subject, $mailbody, $headers);
}

function saveDataToSpreadsheet($data) {
	$user = "forms@goingnowhere.org"; // google account username@gmail.com
	$pass = "g1mm3data"; // google account password (Private)
	$spreadsheet = "Art Registration 2016";

	// Zend Gdata package required
	// http://framework.zend.com/download/gdata

	// NOTE: I had to modify some of the classes in the GData package since
	// they were using Zend_Xml_Security to be paranoid about the XML we get from google.
	// PHP was not finding this class and for what we are doing we should be ok trusting
	// the XML.

	//set_include_path(get_include_path() . PATH_SEPARATOR . "$_SERVER[DOCUMENT_ROOT]/art");
	require_once 'Zend/Loader.php';
	try {
		Zend_Loader::loadClass('Zend_Http_Client');
		Zend_Loader::loadClass('Zend_Gdata');
		Zend_Loader::loadClass('Zend_Gdata_ClientLogin');
		Zend_Loader::loadClass('Zend_Gdata_Spreadsheets');
	} 
	catch (Zend_Exception $e) {
		echo "EXCEPTION ! ";
		echo $e->errorMessage();
		return false;
	}

	$service = Zend_Gdata_Spreadsheets::AUTH_SERVICE_NAME;
	$http = Zend_Gdata_ClientLogin::getHttpClient($user, $pass, $service);
	$client = new Zend_Gdata_Spreadsheets($http);
	
	echo "before sheets<pre>";
	if ($client instanceof Zend_Gdata_Spreadsheets) {
		// Find the ID of the spreadsheet we want to save to
		$id = -1;
		echo "before iterate";
		$feed = $client->getSpreadsheetFeed();
		echo "after iterate";
		var_dump($feed);
		foreach($feed->entries as $entry)
		{
			echo "entry";
		    $spreadsheetTitle = $entry->title->text;
		    
		    if($spreadsheetTitle == $spreadsheet)
		    {
		        $id = basename($entry->id);
		        break;
		    }
		}

		if ($id != -1) {
			$entry = $client->insertRow($data, $id);
			$sheetnotfound = $id;
		} else {
			$sheetnotfound = 1;
		}
	}
}

$failed = 0;
$sheetnotfound = 0;
$spam = 0;
if (strtolower($all["x-nospam"]) != "dust") {
	$spam = 1;
} else {
	try {
		saveDataToFile($all);
	} catch (Zend_Exception $e) {
		$failed += 1;
	}

	try {
		emailData($all);
	} catch (Zend_Exception $e) {
		$failed += 1;
	}

	//try{
		saveDataToSpreadsheet($all);
	//} catch (Zend_Exception $e) {
	//	$failed += 1;
	//}
}

if ($failed >= 3) {
?>
<h2>Epic Fail !</h2>
<p>We are very sorry ! We tried to save the information you submitted but something really bad happened and we could not store it anywhere.</p>
<p>Because of this we are printing it here, so you do not have to type it again.</p>
<p>Please copy the following block and send it to art@goingnowhere.org and we will fix this.</p>
<pre>
<? print(str_replace("\",", "\",\n", json_encode($all))) ?>
</pre>
<?
} else {
?>
	<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
	<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en-gb" lang="en-gb" >
	<head>
	  <meta http-equiv="content-type" content="text/html; charset=utf-8" />
	  <meta name="robots" content="index, follow" />
	  <meta name="title" content="Art Registration - Thank You !" />
	  <title>Art Registration - Thank You !</title>
	  <link href="/templates/nowhere/favicon.ico" rel="shortcut icon" type="image/x-icon" />
	  <link rel="stylesheet" href="http://www.goingnowhere.org/plugins/system/jceutilities/css/jceutilities-217.css" type="text/css" />
	  <link rel="stylesheet" href="http://www.goingnowhere.org/plugins/system/jceutilities/themes/standard/css/style.css" type="text/css" />

	<link rel="stylesheet" href="http://www.goingnowhere.org/templates/system/css/system.css" type="text/css" />
	<link rel="stylesheet" href="http://www.goingnowhere.org/templates/nowhere/css/template.css" type="text/css" />
	<!--[if lte IE 7]>
	<link rel="stylesheet" href="http://www.goingnowhere.org/templates/nowhere/css/ie7.css" type="text/css"  />
	<![endif]-->
	</head>

	<body id="page_bg">

	<div id="top">
		<div id="homelink"><a href="http://www.goingnowhere.org"><h1>Nowhere</h1></a></div>
	</div>
	<div id="nav">
	<ul id="mainlevel-nav"><li><a href="/en/home" class="mainlevel-nav" >Home</a></li><li><a href="/en/news" class="mainlevel-nav" >News</a></li><li><a href="/en/aboutnowhere" class="mainlevel-nav" >About Nowhere</a></li><li><a href="/en/forums" class="mainlevel-nav" >Forums</a></li><li><a href="/en/gallery" class="mainlevel-nav" >Gallery</a></li><li><a href="/en/contact" class="mainlevel-nav" >Contact</a></li></ul>
	</div>
	<div id="maincontent">
		<div id="side_left"></div>
		<div id="side_right"></div>
		<table border="0" cellspacing="0" cellpadding="0" id="innercontent">
			<TR>
				<td align="left" valign="top">
				<div>
					<table class="contentpaneopen">
					<tr>
					<td  width="100%">
					</td>
					</tr>
					</table>

	<table class="contentpaneopen">
	<tr>
		<td></td>
	</tr>
	<tr>
	<td valign="top">
	 <link rel="stylesheet" href="http://www.goingnowhere.org/forms/css/art-grant.css" type="text/css" />  <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js">  </script> <script type="text/javascript" src="http://www.goingnowhere.org/forms/js/jquery.validity.pack.js"> </script>  </script><script type="text/javascript" src="http://www.goingnowhere.org/forms/js/art-form.js"> </script>

	<div id="container">

		<div class="info">
		<? if ($spam == 0) { ?>
		<h1>Thanks for registering your art !!!! <?=$sheetnotfound?></h1>
		<ul>
		<li>You can email the Art team at <a href="mailto:art@goingnowhere.org">art@goingnowhere.org</a> with any questions, or if you need help.</li>
		</ul>
		<? } else { ?>
		<h1>Failed to register your art :(</h1>
		<ul>
		<li>Your submission was filtered out as spam.
		If you believe this is a mistake please write to <a href="mailto:art@goingnowhere.org">art@goingnowhere.org</a> and we will help you submit your request.</li>
		</ul>
		<? } ?>
		<p><a href="http://www.goingnowhere.org/en/artandinnovation/artgrant">Back to the art grants page</a> </p>
		<br/>
		</div>
		</ul>
	 </div>
	</table>
	<span class="article_separator">&nbsp;</span>
				</div>
				</td>
			</TR>
		</table>
	</div>

	<div id="footer">
	Copyright &#169; 2013-2015 Goingnowhere.org | <a href="/en/privacy-policy">Privacy Policy</a>
	</div>
	</body>
</html>

<? } ?>

*/

