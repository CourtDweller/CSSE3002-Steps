var readings = [];
var rangeHigh = 0;
var rangeLow = 1023;
var numReadings = 20;
var buffer = 60; //amount to add to range
var tapBuffer = 10;
var checkFrontTap = false;
var checkBackTap = false;
var frontTapValue = 1023;
var backTapValue = 0;
var frontTapTime = 0;
var backTapTime = 0;
var date = new Date();
var breakTime = 700;
var tapExpiry = 1000;
var minPressure = 70;
var sitPresure = 100;
var standPressure = 600;
var doubleTapTime = 0;


var DoublestepSdk = {
	
	eventHandlers: {
		ReceivedReading: null,
		FrontTap: null,
		BackTap: null,
		DoubleFrontTap: null,
		DoubleBackTap: null
	},
	
	bind: function(event, callback) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			console.error("This is not a valid event handler");
		} else {
			DoublestepSdk.eventHandlers[event] = callback;
		}
	},
	
	unbind: function(event) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			console.error("This is not a valid event handler");
		} else {
			DoublestepSdk.eventHandlers[event] = null;
		}
	},
	
	unbindAll: function() {
		for (var i in DoublestepSdk.eventHandlers) {
			DoublestepSdk.eventHandlers[i] = null;
		}
	},
	
	execEventHandler: function(event, param) {
		if (typeof DoublestepSdk.eventHandlers[event] == "function") {
			DoublestepSdk.eventHandlers[event](param);
		}
	},
	
	init: function() {
		Bluetooth.start();
        Bluetooth.onReceivedDataHandler = DoublestepSdk.onReceivedReading;
	},
	
	onReceivedReading: function(value) {
		value = parseInt(value);
		
		date = new Date();
		if(readings.length < numReadings) {
			readings.push(value);
			console.log("getting initial num readings: " + readings.length);
		} else { 
			if(checkFrontTap) {
				//console.log("checkTap true")
				if(value > rangeHigh) {
					frontTapValue = value;
					if((date.getTime() - frontTapTime) < breakTime) {
						DoublestepSdk.execEventHandler("DoubleFrontTap");
					}
					frontTapTime = date.getTime();
					//$scope.messages.push("Heel tap: " + frontTapTime + " Val: " + frontTapValue);
					//$scope.$apply();
					DoublestepSdk.execEventHandler("FrontTap");
					//console.log("Should have said Tap");
					//Didn't add this one to readings array
				}
				rangeHigh = 0;
				rangeLow = 1023;
				checkFrontTap = false;
				//Think this might be a toe tap
			} else if(checkBackTap) {
				if(value < rangeLow) {
					backTapValue = value;
					if((date.getTime() - backTapTime) < breakTime) {
						DoublestepSdk.execEventHandler("DoubleBackTap");
						doubleTapTime = date.getTime();
					}
					backTapTime = date.getTime();
					//$scope.messages.push("Toe tap: " + backTapTime + " Val: " + backTapValue);
					//$scope.$apply();
					DoublestepSdk.execEventHandler("BackTap");
				}
				rangeHigh = 0;
				rangeLow = 1023;
				checkBackTap = false;
				//Could be residual readings from heel tap
			} else if((date.getTime() <= frontTapTime + tapExpiry) && frontTapValue != -1 && value > (parseInt(frontTapValue) - tapBuffer)) {
				console.log("still tapping - heel");
				rangeHigh = 0;
				//Could be residual readings from toe tap
			} else if((date.getTime() <= (backTapTime + tapExpiry)) && frontTapValue != -1 && value < (parseInt(backTapValue) + tapBuffer)) {
				console.log("still tapping - toe");
				rangeLow = 1023;
				//Think foot is stationery
			} else {
				frontTapValue = 1023;
				backTapValue = 0;
				rangeHigh = 0;
				rangeLow = 1023;
				//console.log("not readings.length < numReadings")
				for (var i = 0; i < (numReadings-1); i++) {
					if (rangeHigh < parseInt(readings[i]) + buffer) {
						rangeHigh = Math.min(parseInt(readings[i]) + buffer, 190);
						//console.log("range High: " + rangeHigh + " i is: " + i);
					}
					if (rangeLow > parseInt(readings[i]) - buffer) {
						rangeLow = Math.max(parseInt(readings[i]) - buffer, minPressure);
						//console.log("range Low: " + rangeLow + " i is: " + i);
						
					}
					readings[i] = readings[i+1];
				}
				//console.log("Range Low: " + rangeLow);
				//console.log("Value: " + value);
				readings[numReadings-1] = value;
				if(value > rangeHigh) {
					checkFrontTap = true;
					//console.log("Check tap is now true");
				} else if(value < rangeLow) {
					checkBackTap = true;
				} else {
					//console.log("Notap pushing");
					//$scope.messages.push("NoTap: " + value);
					//$scope.messages.push("High: " + rangeHigh);
					//$scope.$apply();
				}
			}
		}
		
		DoublestepSdk.execEventHandler('ReceivedReading', value);
	}
}