/*
 * Note: Front tap refers to the initial raise and then drop of the ball of your foot.
 * 	 Back tap refers to the initial raise and then drop of the heel of your foot.
 * 	 Long tap means you leave your foot in the raised state for a minimum of 1.5 seconds.
 */
var readings = []; // Array to store latest pressure readings
var rangeHigh = 0; // Maximum 'normal' pressure reading
var rangeLow = 1023; // Minimum 'normal' pressure reading
var numReadings = 20; // The number of values stored in 'readings', 20 readings is approx 1 second
var checkFrontLift = false; // In the initial phase of a front tap
var checkBackLift = false; // In the initial phase of a back tap
var checkFrontDrop = false; // In the second phase of a front tap
var checkBackDrop = false; // In the second phase of a back tap
var frontTapTime = 0; // The time at which the last front tap began (the ball of the foot was raised off the ground)
var backTapTime = 0; // The time at which the last back tap began (the heel was raised off the ground)
var date = new Date(); // Current date, used to access current time
var longDuration = 1500; // Minimum duration of a long tap
var time = -1; // Current time
var expiry = 5000; // Time after which, if a tap is started and not finished, it is ignored
var lowerOutlier = 0.85; // Ratio applied to pressure reading to determine the lower range bounds
var upperOutlier = 1.15; // Ratio applied to pressure reading to determine the upper range bounds

var DoublestepSdk = {

	// A collection of bindable event handlers of te doublestep system
	eventHandlers: {
		ReceivedReading: null, // is called when a reading is received from the sensor
		FrontTap: null, // is called when a front tap is detected
		BackTap: null, // is called when a back tap is detected
		LongFrontTap: null, // is called whena long front tap is detected
		LongBackTap: null, // is called when a long back tap is detected
		FoundBleDoublestep: null, // is called when a doublestep device is found in a bluetooth scan
		ConnectionFailed: null // is called if the bluetooth connection to the doublestep fails
	},

	// Binds a user function to one of the above events
	bind: function(event, callback) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			DoublestepSdk.error("This is not a valid event handler");
		} else {
			DoublestepSdk.eventHandlers[event] = callback;
		}
	},

	// removes the binding of a user function to one of the above events
	unbind: function(event) {
		if (typeof DoublestepSdk.eventHandlers[event] == "undefined") {
			DoublestepSdk.error("This is not a valid event handler");
		} else {
			DoublestepSdk.eventHandlers[event] = null;
		}
	},

	// removes the bindings of all of the above events
	unbindAll: function() {
		for (var i in DoublestepSdk.eventHandlers) {
			DoublestepSdk.eventHandlers[i] = null;
		}
	},

	// Executes one of the above user-bound events with an optional parameter
	execEventHandler: function(event, param) {
		if (typeof DoublestepSdk.eventHandlers[event] == "function") {
			DoublestepSdk.eventHandlers[event](param);
		}
	},

	// initialises the Doublestep SDK
	init: function() {
		console.log("Initialising Doublestep SDK");
		// Make sure there are no events bound and start the bluetooth comms
		DoublestepSdk.unbindAll();
		DoublestepSdk.bluetooth.start();
	},

	// stop the doubletap system
	stop: function(callback) {
		// stop any bluetooth comms
		DoublestepSdk.bluetooth.stop(function() {
			// disconnect from any existing doubletaps
			bluetoothle.disconnect(function() {
				// clear any system resources associated with the bluetooth connection
				bluetoothle.close(function() {
					console.log("Closed bluetooth connection");
					// remove the connected device and execute the callback
					DoublestepSdk.bluetooth.connectedDevice = null;
					if (typeof callback == "function") {
						callback();
					}
				}, function(error) {
					DoublestepSdk.error({msg: "Could not close bluetooth connection", obj: error});
					// an error occured, but let's execute the callback anyway.
					if (typeof callback == "function") {
						callback();
					}
				}, {
					address: DoublestepSdk.bluetooth.connectedDevice // the device to close the connection to
				});
			}, function(error) {
				DoublestepSdk.error({msg: "Could not disconnect from device", obj: error});
				// an error occured, but let's execute the callback anyway.
				if (typeof callback == "function") {
					callback();
				}
			}, {
				address: DoublestepSdk.bluetooth.connectedDevice // the device to disconnect from
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

	// Subclass which handles all bluetooth comms
	bluetooth : {
		options: {
			connectTo: null, // the doubelstep to connect to (used primarily in auto-connect
			autoconnect: true // should the system auto connect to the above doublestep?
		},

		connectedDevice: null, // the currentyl connected doublestep (may not be the same as connectTo above)

		// start bluetooth communications
		start: function() {
			// check we're on a supported platform,
			if (!device.isAndroid) {
				// nope - stop here
				DoublestepSdk.error("Bluetooth cannot run on this platform");
				return;
			}
			console.log("Starting the Bluetooth service");
			// check bluetooth is enabled
			bluetoothle.isEnabled(function(enabled) {
				if (enabled) {
					// initialise the bluetooth communication
					// starts the search/connect on success or executes an error
					bluetoothle.initialize(DoublestepSdk.bluetooth.connectOrSearch, DoublestepSdk.error);
				} else {
					// bluetooth not enabled, attempt to do so
					console.log("Bluetooth is not enabled - attempting to enable");
					bluetoothle.enable(function() {
						// bluetooth enabled, now initialise the bluetooth communication
						// starts the search/connect on success or executes an error
						bluetoothle.initialize(DoublestepSdk.bluetooth.connectOrSearch, DoublestepSdk.error);
					});
				}

			});
		},

		// stop scanning and listenging for comms and stop scanning for devices
		stop: function(callback) {
			console.log("Stopping bluetooth comms to device " + DoublestepSdk.bluetooth.connectedDevice);
			DoublestepSdk.bluetooth.stopDeviceScan(function() {
				DoublestepSdk.bluetooth.stopListeningForData(callback);
			});
		},

		// connects to the connectTo device is we're autoconnecting, otherwise starts searching
		connectOrSearch: function() {
			// have we been told to connect to a specific doublestep?
			if (DoublestepSdk.bluetooth.options.connectTo === null) {
				// we have not, so start scanning for devices
				console.log("Searching for Bluetooth devices");
				bluetoothle.startScan(DoublestepSdk.bluetooth.onDeviceScan, DoublestepSdk.error);
			} else {
				// yes, we should be connecting to a doublestep
				DoublestepSdk.bluetooth.connect(DoublestepSdk.bluetooth.options.connectTo, function() {
					DoublestepSdk.error("Could not connect to the specified bluetooth device address.");
					DoublestepSdk.execEventHandler("ConnectionFailed");
				});
			}
		},

		// stops scanning for doublesteps
		stopDeviceScan: function(callback) {
			console.log("Stopping device scanning", callback);
			// stop scanning
			bluetoothle.stopScan(function() {
				console.log("Stopped scanning");
				// scanning stopped - execute callback
				if (typeof callback == "function") {
					callback();
				}
			}, function(error) {
				// an error occurred, but execute the callback anyway
				if (typeof callback == "function") {
					callback();
				}
				DoublestepSdk.error({msg: "Could not stop scanning", obj: error});
			});
		},

		// This is called whenever a bluetooth scan happens
		// (roughly once per second) It will scan for all Bluetooth LE devices
		onDeviceScan: function(devices) {
			// check that we have the results of the scan (other events also can trigger this)
			if (devices.status != "scanResult") { return; }
			// we expect multiple devices to be in range, so if only one, put it in an array
			if (typeof devices == "object" && typeof devices.address != "undefined") {
				devices = [devices];
			}
			// loop over each found device to filter for Doublesteps
			for (var i = 0; i<devices.length; i++) {
				// check if this device is a doubelstep
				if (devices[i].name == "BLE UART" || devices[i].name.indexOf("DSTEP") !== false) {
					// yes it is. Should we be auto connecting?
					if (DoublestepSdk.bluetooth.options.autoconnect) {
						// yes we should be, so stop any further scanning
						// (the actual connecting will be done in event executed below)
						bluetoothle.stopScan();
					}
					// execute some action on this found device
					DoublestepSdk.bluetooth.onFoundBleUart(devices[i]);
				}
			}
		},

		// Is called when a DOublestep device is found in a bluetooth scan
		onFoundBleUart: function(device, autoconnect) {
			console.log("Found DOUBLESTEP: ", device);
			// should we be auto-connecting to the doubvlestep?
			if (DoublestepSdk.bluetooth.options.autoconnect) {
				// yes, so do it!
				console.log("Inititiating connection...");
				DoublestepSdk.bluetooth.connect(device.address);
			}
			// execute the user-bound event handler for this event
			DoublestepSdk.execEventHandler("FoundBleDoublestep", device);
		},

		// connects to the specified doublestep
		connect: function(address, errorCallback) {
			console.log("Connecting to " + address);
			// attempt to connect
			bluetoothle.connect(function() {
				console.log("Successfully connected to", address);
				// Connection successful, now find out what the device is capable of
				bluetoothle.discover(function(services) {
					// set the connected device, and start listening for sensor readings
					DoublestepSdk.bluetooth.connectedDevice = address;
					console.log("Discovered services: ", services);
					DoublestepSdk.bluetooth.listenForData(address);
				}, function() {
					DoublestepSdk.error("Failed to Discover");
				}, { address: address }); // the bluetooth address of the doublestep to connect to 
			}, (
				 // if we've defined an error handler callback, use it, otherwise, use the default.
				typeof errorCallback == "function" ? errorCallback : DoublestepSdk.error
			), { address: address }); // the bluetooth address of the doublestep to connect to 
		},

		// listen for sensor readings from the specified (already connected) doublestep
		listenForData: function(address) {
			console.log("Listening to " + address);
			// subscribe to the serial-read service of the doubelstep
			// (ie, bind to the event which sends us sensor data)
			bluetoothle.subscribe(DoublestepSdk.bluetooth.onReceivedData, DoublestepSdk.error, {
				address: address, // the boluetooth address of the doublestep
				serviceUuid:		"6e400001-b5a3-f393-e0a9-e50e24dcca9e", // this identifier represents the serial service
				characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e", // this identifier represents the "read" event of the serial service
				isNotification: true // yes, we should be notified when we receive data (by means of the above specified callback/handler)
			});
		},

		// stop listening for sensor readings from the doublestep
		stopListeningForData: function(callback) {
			// are we connected to any devices?
			if (DoublestepSdk.bluetooth.connectedDevice !== null) {
				console.log("Stopping listening for bluetooth data");
				// yes, we're connected - unsubscribe from the sensor read events
				bluetoothle.unsubscribe(function() {
					console.log("Stopped listening for bluetooth data");
					// successfully unsubscribed - execute callback
					if (typeof callback == "function") {
						callback();
					}
				}, function(error) {
					DoublestepSdk.error({msg: "Could not stop listening for bluetooth data", obj: error});
					// we couldn't unsubscribe, but execute the callback anyway
					if (typeof callback == "function") {
						callback();
					}
				}, {
					address: DoublestepSdk.bluetooth.connectedDevice, // the bluetooth address of the doubelstep
  					serviceUuid: 		"6e400001-b5a3-f393-e0a9-e50e24dcca9e", // this identifier represents the serial service
  					characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // this identifier represents the "read" event of the serial service
				});
			} else {
				// we're not connected to any devices, but execute the callback anyway
				if (typeof callback == "function") {
					callback();
				}
			}
		},

		// this is called when we've received data from the doublestep 
		onReceivedData: function(data) {
			// there are different types of data we may get
			// make sure it's the serial event we've subscribed too
			if (data.status == "subscribedResult") {
				// the data we've received is going to be a base64 encoded string
				// decode it and execute our ReceivedReading handler
				data = atob(data.value).trim()
				DoublestepSdk.onReceivedReading(data);
			}
		}
	},

	// a (relativly poor) simulation subclass
	simulate: {
		randomDataTimer: null, // timer for the RandomData simulation mode
		variedDataTimer: null, // timer for the VariedData simulation mode

		// This will execute the user-bound "ReceivedReading" event handler
		receivedReading: function(value) {
			DoublestepSdk.execEventHandler('ReceivedReading', value);
		},

		// This will execute the user-bound "FrontTap" event handler
		frontTap: function() {
			DoublestepSdk.execEventHandler('FrontTap');
		},

		// This will execute the user-bound "BackTap" event handler
		backTap: function() {
			DoublestepSdk.execEventHandler('BackTap');
		},

		// This will execute the user-bound "LongFrontTap" event handler
		longFrontTap: function() {
			DoublestepSdk.execEventHandler('LongFrontTap');
		},

		// This will execute the user-bound "LongBackTap" event handler
		longBackTap: function() {
			DoublestepSdk.execEventHandler('LongBackTap');
		},

		// this simulation mode will simulate receiving random sensor readings
		// between [min] and [max]
		startRandomData: function(min, max) {
			// set some default min/max values if we didnt get any
			if (typeof min == "undefined" || min === null) {
				min = 0;
			}
			if (typeof max == "undefined" || max === null) {
				max = 1023;
			}
			// stop any other simulation modes
			DoublestepSdk.simulate.stop();
			// start the simulation timer (10 readings per second)
			DoublestepSdk.simulate.randomDataTimer = setInterval(function() {
				// get a random value between min and max, and execute the ReceivedReading event
				var value = Math.floor(Math.random() * max) + min;
				console.log(value);
				DoublestepSdk.onReceivedReading(value);
			}, 100);
		},

		// this simulation mode will simulate receiving sensor readings within a
		// percentage [variation] of a specified [value]. ie. 500 +/- 10%
		// NOTE that variation is natural, not decimal, so use 10 for 10%, not 0.1
		startVariedData(value, variation) {
			// set some default value/variation values if we didnt get any
			if (typeof value == "undefined" || value === null) {
				value = 500;
			}
			if (typeof variation == "undefined" || variation === null) {
				variation = 10; //percent
			}
			// stop any other simulation modes
			DoublestepSdk.simulate.stop();
			// start the simulation timer (10 readings per second)
			DoublestepSdk.simulate.variedDataTimer = setInterval(function() {
				// get a random value with [variation] percent of the specified value
				var v = value * (1+((Math.floor(Math.random() * variation * 2) - variation) / 100));
				console.log(v);
				// execute the ReceivedReading event
				DoublestepSdk.onReceivedReading(v);
			}, 100);
		},

		// stop all simulation modes
		stop: function() {
			clearInterval(DoublestepSdk.simulate.randomDataTimer);
			clearInterval(DoublestepSdk.simulate.variedDataTimer);
		}
	},

	// default error handler for the doublestep system
	error: function(value) {
		// this nasty stuff is a bit of a back to make sure we get a stack trace of the error
		var e = new Error();
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		console.error("DoublestepSdk Error: ", value, stack);
	}
};
