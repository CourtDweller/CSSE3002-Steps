module.exports = {
	setAlarm: function(time, successCallback, errorCallback) {
		errorCallback = errorCallback || this.errorCallback;
        cordova.exec(successCallback, errorCallback, 'AlarmClock', 'setAlarm', [time]);
	},
	
	errorCallback: function(error) {
		console.error("ERROR: " + error);
	}
}