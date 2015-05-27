module.exports = {
	declineCall: function(successCallback, errorCallback) {
		errorCallback = errorCallback || this.errorCallback;
        cordova.exec(successCallback, errorCallback, 'PhoneAttendant', 'declineCall', []);
	},
	
	errorCallback: function(error) {
		console.error("ERROR: " + error);
	}
}