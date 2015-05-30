module.exports = {
	show: function(successCallback, errorCallback) {
		errorCallback = errorCallback || this.errorCallback;
        cordova.exec(function(time) {
			if (typeof successCallback == "function") {
				successCallback(JSON.parse(time));
			}
		}, errorCallback, 'TimePicker', 'show', []);
	},
	
	errorCallback: function(error) {
		console.error("ERROR: " + error);
	}
}
