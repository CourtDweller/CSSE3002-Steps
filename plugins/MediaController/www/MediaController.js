module.exports = {
	next: function(successCallback, errorCallback) {
		this.control("next", successCallback, errorCallback);
	},
	
	previous: function(successCallback, errorCallback) {
		this.control("previous", successCallback, errorCallback);
	},
	
	pause: function(successCallback, errorCallback) {
		this.control("pause", successCallback, errorCallback);
	},
	
	play: function(successCallback, errorCallback) {
		this.control("play", successCallback, errorCallback);
	},
	
	stop: function(successCallback, errorCallback) {
		this.control("stop", successCallback, errorCallback);
	},
	
	rewind: function(successCallback, errorCallback) {
		this.control("rewind", successCallback, errorCallback);
	},
	
	fastforward: function(successCallback, errorCallback) {
		this.control("fastforward", successCallback, errorCallback);
	},
	
	control: function(action, successCallback, errorCallback) {
		errorCallback = errorCallback || this.errorCallback;
        cordova.exec(successCallback, errorCallback, 'MediaController', action, []);
	},
	
	errorCallback: function(error) {
		console.error("ERROR: " + error);
	}
}