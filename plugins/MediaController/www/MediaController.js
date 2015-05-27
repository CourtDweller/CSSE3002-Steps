module.exports = {
	control: function(action, successCallback, errorCallback) {
		errorCallback = errorCallback || this.errorCallback;
        cordova.exec(successCallback, errorCallback, 'MediaController', action, []);
	},
	
	errorCallback: function(error) {
		console.error("ERROR: " + error);
	}
}