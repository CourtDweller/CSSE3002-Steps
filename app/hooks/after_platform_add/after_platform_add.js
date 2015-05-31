#!/usr/bin/env node

console.log("Changing android theme...");

var manifest = "platforms/android/AndroidManifest.xml";
var fs = require('fs');
fs.readFile(manifest, 'utf8', function (err,data) {
	if (err) {
		return console.log(err);
	}
	var result = data.replace(/Theme\.Black\.NoTitleBar/g, 'Theme.DeviceDefault');
	fs.writeFile(manifest, result, 'utf8', function (err) {
		if (err) return console.log(err);
	});
});

console.log("... Done.");