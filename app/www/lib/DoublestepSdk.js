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
var doubleBackTime = -1;
var doubleFrontTime = -1;
var time = -1;
var frontTapNeedsLogging = false;
var backTapNeedsLogging = false;

var DoublestepSdk = {

	eventHandlers: {
		ReceivedReading: null,
		FrontTap: null,
		BackTap: null,
		DoubleFrontTap: null,
		DoubleBackTap: null,
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

		date = new Date();
		time = date.getTime();
		if(((time - backTapTime) > breakTime) &&
				backTapNeedsLogging) {
			DoublestepSdk.execEventHandler("BackTap");
			backTapNeedsLogging = false;
			console.log("Backtap Registered");
		}
		else if(((time - frontTapTime) > breakTime) &&
				frontTapNeedsLogging) {
			DoublestepSdk.execEventHandler("FrontTap");
			frontTapNeedsLogging = false;
			console.log("FrontTap Registered");
		}
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
						doubleFrontTime = time;
						frontTapNeedsLogging = false;
						console.log("DoubleFrontTap Registered");
					} else {
						frontTapNeedsLogging = true;
					}
					frontTapTime = time;
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
						doubleBackTime = time;
						backTapNeedsLogging = false;
						console.log("DoubleBackTap Registered");
					} else {
						backTapNeedsLogging = true;
					}
					backTapTime = time;
				}
				rangeHigh = 0;
				rangeLow = 1023;
				checkBackTap = false;
			//Could be residual readings from heel tap
			} else if((time <= frontTapTime + tapExpiry) && frontTapValue != -1 && value > (parseInt(frontTapValue) - tapBuffer)) {
				console.log("still tapping - heel");
				rangeHigh = 0;
			//Could be residual readings from toe tap
			} else if((time <= (backTapTime + tapExpiry)) && backTapValue != -1 && value < (parseInt(backTapValue) + tapBuffer)) {
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
					if (rangeHigh < parseInt(readings[i])*1.1) {
						rangeHigh = parseInt(readings[i])*1.1;
						//console.log("range High: " + rangeHigh + " i is: " + i);
					}
					if (rangeLow > parseInt(readings[i])*0.9) {
						rangeLow = parseInt(readings[i])*0.9;
						//console.log("range Low: " + rangeLow + " i is: " + i);
					}
					readings[i] = readings[i+1];
				}
				//console.log("Range Low: " + rangeLow);
				//console.log("Range High: " + rangeHigh);
				console.log("Value: " + value);
				readings[numReadings-1] = value;
				if(value > rangeHigh) {
					checkFrontTap = true;
					console.log("Check front tap is now true");
				} else if(value < rangeLow) {
					checkBackTap = true;
					console.log("Check back tap is now true");
				} else {
					//console.log("Notap pushing");
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
