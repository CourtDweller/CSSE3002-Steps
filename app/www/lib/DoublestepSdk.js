/*
 * Note: Front tap refers to the inital raise and then drop of the ball of your foot.
 * 	 Back tap refers to the initial raise and then drop of the heel of your foot.
 * 	 Long tap means you leave your foot in the raised state for a minimum of 1.5 seconds.
 */
var readings = []; // Array to store latest pressure readings
var rangeHigh = 0; // Maximum 'normal' pressure reading
var rangeLow = 1023; // Minimum 'normal' pressure reading
var numReadings = 20; // The number of values stored in 'readings', 20 readings is approx 1 second
var checkFrontLift = false; // In the intial phase of a front tap
var checkBackLift = false; // In the inital phase of a back tap
var checkFrontDrop = false; // In the second phase of a front tap
var checkBackDrop = false; // In the second phase of a back tap
var frontTapTime = 0; // The time at which the last front tap began (the ball of the foot was raised off the ground)
var backTapTime = 0; // The time at which the last back tap begain (the heel was raised off the ground)
var date = new Date(); // Current date, used to access current time
var longDuration = 1500; // Minimum duration of a long tap
var time = -1; // Current time
var expiry = 5000; // Time after which, if a tap is started and not finished, it is ignored
var lowerOutlier = 0.85; // Ratio applied to pressure reading to determine the lower range bounds
var upperOutlier = 1.15; // Ratio applied to pressure reading to determine the upper range bounds

var DoublestepSdk = {

	eventHandlers: {
		ReceivedReading: null,
		FrontTap: null,
		BackTap: null,
		LongFrontTap: null,
		LongBackTap: null,
		FoundBleDoublestep: null,
		ConnectionFailed: null
	},

	bind: function(event, callback) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			DoublestepSdk.error("This is not a valid event handler");
		} else {
			DoublestepSdk.eventHandlers[event] = callback;
		}
	},

	unbind: function(event) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			DoublestepSdk.error("This is not a valid event handler");
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
		console.log("Initialising Doublestep SDK");
		DoublestepSdk.unbindAll();
		DoublestepSdk.bluetooth.start();
	},

	stop: function(callback) {
		DoublestepSdk.bluetooth.stop(function() {
			bluetoothle.disconnect(function() {
				bluetoothle.close(function() {
					console.log("Closed bluetooth connection");
					DoublestepSdk.bluetooth.connectedDevice = null;
					if (typeof callback == "function") {
						callback();
					}
				}, function(error) {
					DoublestepSdk.error({msg: "Could not close bluetooth connection", obj: error});
					if (typeof callback == "function") {
						callback();
					}
				}, {
					address: DoublestepSdk.bluetooth.connectedDevice
				});
			}, function(error) {
				DoublestepSdk.error({msg: "Could not disconnect from device", obj: error});
				if (typeof callback == "function") {
					callback();
				}
			}, {
				address: DoublestepSdk.bluetooth.connectedDevice
			});
		});
	},

	/* 
	 * Called whenever the device recieves data over bluetooth (i.e. each 
	 * time it recieves a pressure reading). Stores recent pressure readings
	 * to detect any taps (front tap, back tap, long front tap or long back 
	 * tap) the user makes.
	 */
	onReceivedReading: function(value) {
		
		value = parseInt(value);
		value = value - 60; // Pressure when foot in air is approx 60, want this to be 0

		date = new Date();
		time = date.getTime(); // Get the time at which this readings was recieved in ms

		// Timeout on waiting for back tap to end. Ignore it, assuming the user has changed state
		// (sitting to standing etc.) and reset readings
		if(checkBackDrop && (time > backTapTime + expiry)) {
			checkBackDrop = false;
			readings = [];
		// Timeout on waiting for front tap to end. Ignore it, assuming the user has changed state
		// (siting to standing etc.) and reset readings
		} else if(checkFrontDrop && (time > frontTapTime + expiry)) {
			checkFrontDrop = false;
			readings = [];
		}



		// Haven't got enough readings to accurately determine 'normal' range of pressures,
		// keep filling up the array
		if(readings.length < numReadings) {
			readings.push(value);
			console.log("getting initial num readings: " + readings.length);
		// Have enough readings to accurately determine 'normal' range of pressures
		} else {
			// EACH MAIN BRANCH BELOW REPRESENTS 5 STATES: 
			// 	Initial phase of front tap
			// 	Initial phase of back tap
			// 	End pahse of front tap
			// 	End phase of back tap
			// 	Normal
			// ONLY EVERY GO THROUGH 1 OF THESE FOR A GIVEN READING, BUT POTENTIALLY
			// TRIGGER A CHANGE OF STATE FOR THE NEXT READING

			// This is the start of a front tap
			if(checkFrontLift) {
				// Record the time the tap started, then start looking for
				// second stage of tap (drop of ball of foot back to ground)
				frontTapTime = time;
				checkFrontLift = false;
				checkFrontDrop = true;
			// Think is the start of a back tap
			} else if(checkBackLift) {
				// Record the time the tap started, then start looking for 
				// second stage of tap (drop of heel back to ground)
				backTapTime = time;
				checkBackLift = false;
				checkBackDrop = true;
			// Waiting for end of front tap
			} else if(checkFrontDrop) {
				// Pressure back in normal range - ball of foot has dropped back to ground
				if(value < rangeHigh) {	
					console.log("Detected front drop");
					// Tap has finished, reset readings to determine normal range in
					// case user has changed stance post-tap
					checkFrontDrop = false;
					readings = [];
					// Regular front tap
					if(time - frontTapTime < longDuration) {
						console.log("Front tap");
						// Fires the 'Front Tap' event handler, developer can
						// assign custom action to this event
						DoublestepSdk.execEventHandler('FrontTap', value);
					// Long tap
					} else {
						console.log("Long front tap");
						// Fires the 'Long Front Tap' event handler, developer can
						// assign custom action to this event
						DoublestepSdk.execEventHandler('LongFrontTap', value);
					}
				}
			// Waiting for end of back tap
			} else if(checkBackDrop) {
				// Pressure back in normal range - heel has dropped back to ground
				if(value > rangeLow) {
					console.log("Detected back drop");
					// Tap has finished, reset readings to determine normal range in
					// case user has changed stance post-tap
					checkBackDrop = false;
					readings = [];
					// Regular back tap
					if(time - backTapTime < longDuration) {
						// Fires the 'Back Tap' event handler, developer can
						// assign custom action to this event
						console.log("Back tap");
						DoublestepSdk.execEventHandler('BackTap', value);
					// Long tap
					} else {
						// Fires the 'Long Back Tap' event handler, developer can
						// assign custom action to this event
						console.log("Long back tap");
						DoublestepSdk.execEventHandler('LongBackTap', value);
					}
				}
			// Think foot is stationery
			} else {
				// Reset range so it will be determined only by current state of the array
				rangeHigh = 0;
				rangeLow = 1023;

				// UPDATE RANGE BASED ON PREVIOUS READINGS
				// Loop through readings array (only going up to length of array (numReadings)
				// - 1 because will be indexing the i+1 th element
				for (var i = 0; i < (numReadings-1); i++) {
					// If the reading is higher than the current range high, update it
					// Also apply ratio to make sure that if a value is outside the range,
					// then it is significantly different to a 'normal' value
					if (rangeHigh < parseInt(readings[i])*upperOutlier) {
						rangeHigh = parseInt(readings[i])*upperOutlier;
					}
					// If the reading is lower than teh current range low, update it
					// Also apply a ratio to make sure that if a value is outside the range,
					// then it is significantly different to a 'normal' value
					if (rangeLow > parseInt(readings[i])*lowerOutlier) {
						rangeLow = parseInt(readings[i])*lowerOutlier;
					}

					// Push all readings back 1 slot in the array to make space for the new
					// one, effectively overwrites the 0th (i.e. the oldest) reading
					readings[i] = readings[i+1];
				}

				console.log("Value: " + value + " Low: " + rangeLow + " High: " + rangeHigh);
				
				// ADD NEW READING. Note this only happens if we're not detecting any
				// type of tap, and in this way we only store 'normal' readings in the
				// readings array, to avoid skewing the range high and low variables

				// Store the current pressure value at the end of the readings array
				readings[numReadings-1] = value;

				// If the current reading is above the normal range, ball of the foot
				// is raised and this is the start of a front tap
				if(value > rangeHigh) {
					checkFrontLift = true;
					console.log("Check front tap is now true");
				// If the current readings is below the normal range, ball of the foot
				// is raised and this is the start of a back tap
				} else if(value < rangeLow) {
					checkBackLift = true;
					console.log("Check back tap is now true");
				}
			}
		}
		// Fires the 'Received Reading' event handler, developer can assign custom action to 
		// this event
		DoublestepSdk.execEventHandler('ReceivedReading', value);
	},

	bluetooth : {
		options: {
			connectTo: null,
			autoconnect: true
		},

		connectedDevice: null,

		start: function() {
			if (!device.isAndroid && !device.isIos) {
				DoublestepSdk.error("Bluetooth cannot run on this platform");
				return;
			}
			console.log("Starting the Bluetooth service");
			bluetoothle.isEnabled(function(enabled) {
				if (enabled) {
					bluetoothle.initialize(DoublestepSdk.bluetooth.connectOrSearch, DoublestepSdk.error);
				} else {
					console.log("Bluetooth is not enabled - attempting to enable");
					bluetoothle.enable(function() {
						bluetoothle.initialize(DoublestepSdk.bluetooth.connectOrSearch, DoublestepSdk.error);
					});
				}

			});
		},

		stop: function(callback) {
			console.log("Stopping bluetooth comms to device " + DoublestepSdk.bluetooth.connectedDevice);
			DoublestepSdk.bluetooth.stopDeviceScan(function() {
				DoublestepSdk.bluetooth.stopListeningForData(callback);
			});
		},

		connectOrSearch: function() {
			if (DoublestepSdk.bluetooth.options.connectTo === null) {
				console.log("Searching for Bluetooth devices");
				bluetoothle.startScan(DoublestepSdk.bluetooth.onDeviceScan, DoublestepSdk.error);
			} else {
				DoublestepSdk.bluetooth.connect(DoublestepSdk.bluetooth.options.connectTo, function() {
					DoublestepSdk.error("Could not connect to the specified bluetooth device address.");
					DoublestepSdk.execEventHandler("ConnectionFailed");
				});
			}
		},

		stopDeviceScan: function(callback) {
			console.log("Stopping device scanning", callback);
			bluetoothle.stopScan(function() {
				console.log("Stopped scanning");
				if (typeof callback == "function") {
					callback();
				}
			}, function(error) {
				if (typeof callback == "function") {
					callback();
				}
				DoublestepSdk.error({msg: "Could not stop scanning", obj: error});
			});
		},

		onDeviceScan: function(devices) {
			if (devices.status != "scanResult") { return; }
			if (typeof devices == "object" && typeof devices.address != "undefined") {
				devices = [devices];
			}
			for (var i = 0; i<devices.length; i++) {
				if (devices[i].name == "BLE UART") {
					if (DoublestepSdk.bluetooth.options.autoconnect) {
						bluetoothle.stopScan();
					}
					DoublestepSdk.bluetooth.onFoundBleUart(devices[i]);
				}
			}
		},

		onFoundBleUart: function(device, autoconnect) {
			console.log("Found BLE UART: ", device);
			if (DoublestepSdk.bluetooth.options.autoconnect) {
				console.log("Inititiating connection...");
				DoublestepSdk.bluetooth.connect(device.address);
			}
			DoublestepSdk.execEventHandler("FoundBleDoublestep", device);
		},

		connect: function(address, errorCallback) {
			console.log("Connecting to " + address);
			bluetoothle.connect(function() {
				console.log("Successfully connected to", address);
				bluetoothle.discover(function(services) {
					DoublestepSdk.bluetooth.connectedDevice = address;
					console.log("Discovered services: ", services);
					DoublestepSdk.bluetooth.listenForData(address);
				}, function() {
					DoublestepSdk.error("Failed to Discover");
				}, { address: address });
			}, (typeof errorCallback == "function" ? errorCallback : DoublestepSdk.error), { address: address });
		},

		listenForData: function(address) {
			console.log("Listening to " + address);
			bluetoothle.subscribe(DoublestepSdk.bluetooth.onReceivedData, DoublestepSdk.error, {
				address: address,
				serviceUuid:		"6e400001-b5a3-f393-e0a9-e50e24dcca9e",
				characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
				isNotification: true
			});
		},

		stopListeningForData: function(callback) {
			if (DoublestepSdk.bluetooth.connectedDevice !== null) {
				console.log("Stopping listening for bluetooth data");
				bluetoothle.unsubscribe(function() {
					console.log("Stopped listening for bluetooth data");
					if (typeof callback == "function") {
						callback();
					}
				}, function(error) {
					DoublestepSdk.error({msg: "Could not stop listening for bluetooth data", obj: error});
					if (typeof callback == "function") {
						callback();
					}
				}, {
					address: DoublestepSdk.bluetooth.connectedDevice,
  					serviceUuid: 		"6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  					characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
				});
			} else {
				if (typeof callback == "function") {
					callback();
				}
			}
		},

		onReceivedData: function(data) {
			if (data.status == "subscribedResult") {
				DoublestepSdk.onReceivedReading(atob(data.value).trim());
			}
		}
	},

	simulate: {
		randomDataTimer: null,
		variedDataTimer: null,

		receivedReading: function(value) {
			DoublestepSdk.execEventHandler('ReceivedReading', value);
		},

		frontTap: function() {
			DoublestepSdk.execEventHandler('FrontTap');
		},

		backTap: function() {
			DoublestepSdk.execEventHandler('BackTap');
		},

		doubleFrontTap: function() {
			DoublestepSdk.execEventHandler('DoubleFrontTap');
		},

		doubleBackTap: function() {
			DoublestepSdk.execEventHandler('DoubleBackTap');
		},

		startRandomData: function(min, max) {
			if (typeof min == "undefined" || min === null) {
				min = 0;
			}
			if (typeof max == "undefined" || max === null) {
				max = 1023;
			}
			DoublestepSdk.simulate.stop();
			DoublestepSdk.simulate.randomDataTimer = setInterval(function() {
				var value = Math.floor(Math.random() * max) + min;
				console.log(value);
				DoublestepSdk.onReceivedReading(value);
			}, 100);
		},

		startVariedData(value, variation) {
			if (typeof value == "undefined" || value === null) {
				value = 500;
			}
			if (typeof variation == "undefined" || variation === null) {
				variation = 5; //percent
			}
			DoublestepSdk.simulate.stop();
			DoublestepSdk.simulate.variedDataTimer = setInterval(function() {
				var v = value * (1+((Math.floor(Math.random() * variation * 2) - variation) / 100));
				console.log(v);
				DoublestepSdk.onReceivedReading(v);
			}, 100);
		},

		stop: function() {
			clearInterval(DoublestepSdk.simulate.randomDataTimer);
			clearInterval(DoublestepSdk.simulate.variedDataTimer);
		}
	},

	error: function(value) {
		var e = new Error('dummy');
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		console.error("DoublestepSdk Error: ", value, stack);
	}
};
