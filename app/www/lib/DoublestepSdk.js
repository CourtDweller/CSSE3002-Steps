var readings = [];
var rangeHigh = 0;
var rangeLow = 1023;
var numReadings = 20;
var checkFrontLift = false;
var checkBackLift = false;
var checkFrontDrop = false;
var checkBackDrop = false;
var frontTapValue = 1023;
var backTapValue = 0;
var frontTapTime = 0;
var backTapTime = 0;
var date = new Date();
var longDuration = 2000;
var time = -1;
var frontTapNeedsLogging = false;
var backTapNeedsLogging = false;
var expiry = 5000;
var lowerOutlier = 0.85;
var upperOutlier = 1.15;

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
				}, DoublestepSdk.error, {
					address: DoublestepSdk.bluetooth.connectedDevice
				});
			}, DoublestepSdk.error, {
				address: DoublestepSdk.bluetooth.connectedDevice
			});
		});
	},

	onReceivedReading: function(value) {
		value = parseInt(value);
		value = value - 60;

		date = new Date();
		time = date.getTime();
		if(checkBackDrop && (time > backTapTime + expiry)) {
			checkBackDrop = false;
			readings = [];
		} else if(checkFrontDrop && (time > frontTapTime + expiry)) {
			checkFrontDrop = false;
			readings = [];
		}
		if(readings.length < numReadings) {
			readings.push(value);
			console.log("getting initial num readings: " + readings.length);
		} else {
			// This is the start of a front tap
			if(checkFrontLift) {
				frontTapValue = value;
				frontTapTime = time;
				checkFrontLift = false;
				checkFrontDrop = true;
			// Think is the start of a back tap
			} else if(checkBackLift) {
				backTapValue = value;
				backTapTime = time;
				checkBackLift = false;
				checkBackDrop = true;
			// Waiting for end of front tap
			} else if(checkFrontDrop) {
				if(value < rangeHigh) {
					console.log("Detected front drop");
					checkFrontDrop = false;
					rangeLow = 1023;
					rangeHigh = 0;
					readings = [];
					if(time - frontTapTime < longDuration) {
						console.log("Front tap");
						DoublestepSdk.execEventHandler('FrontTap', value);
					} else {
						console.log("Long front tap");
						DoublestepSdk.execEventHandler('LongFrontTap', value);
					}
				}
			// Waiting for end of back tap
			} else if(checkBackDrop) {
				if(value > rangeLow) {
					console.log("Detected back drop");
					checkBackDrop = false;
					rangeLow = 1023;
					rangeHigh = 0;
					readings = [];
					if(time - backTapTime < longDuration) {
						console.log("Back tap");
						DoublestepSdk.execEventHandler('BackTap', value);
					} else {
						console.log("Long back tap");
						DoublestepSdk.execEventHandler('LongBackTap', value);
					}
				}

			// Think foot is stationery
			} else {
				frontTapValue = 1023;
				backTapValue = 0;
				rangeHigh = 0;
				rangeLow = 1023;
				for (var i = 0; i < (numReadings-1); i++) {
					if (rangeHigh < parseInt(readings[i])*upperOutlier) {
						rangeHigh = parseInt(readings[i])*upperOutlier;
					}
					if (rangeLow > parseInt(readings[i])*lowerOutlier) {
						rangeLow = parseInt(readings[i])*lowerOutlier;
					}
					readings[i] = readings[i+1];
				}
				console.log("Value: " + value + " Low: " + rangeLow + " High: " + rangeHigh);
				readings[numReadings-1] = value;
				if(value > rangeHigh) {
					checkFrontLift = true;
					console.log("Check front tap is now true");
				} else if(value < rangeLow) {
					checkBackLift = true;
					console.log("Check back tap is now true");
				}
			}
		}

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
			console.log("stopping bluetooth comms to device " + DoublestepSdk.bluetooth.connectedDevice);
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
			console.log("Stopping device scanning");
			bluetoothle.stopScan(function() {
				console.log("Stopped scanning");
				if (typeof callback == "function") {
					callback();
				}
			}, function(error) {
				DoublestepSdk.error({msg: "Could not stop scanning", obj: error});
				if (typeof callback == "function") {
					callback();
				}
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
