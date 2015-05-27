var Bluetooth = {
	onReceivedDataHandler: null,
	onDevicesFoundHandler: null,

	start: function() {
		if (!device.isAndroid && !device.isIos) {
			console.error("Bluetooth cannot run on this platform");
			return;
		}

		Log("Starting the Bluetooth service");
		bluetoothle.isEnabled(function(enabled) {
			if (enabled) {
				bluetoothle.initialize(Bluetooth.searchDevices, Error);
			} else {
				console.log("Bluetooth is not enabled");
				if (device.isAndroid) {
					console.log("Enabling Bluetooth");
					bluetoothle.enable(function() {
						bluetoothle.initialize(Bluetooth.searchDevices, Error);
					});
				} else if (device.isIos) {
					alert("Please enable Bluetooth!");
				}
			}

		});
	},

	searchDevices: function() {
		Log("Searching for Bluetooth devices");
		if (device.isAndroid) {
			//bluetoothle.discoverUnpaired(Bluetooth.onDevicesFound, Error);
			//bluetoothle.discover(Bluetooth.onDevicesFound, Error);
			bluetoothle.startScan(Bluetooth.onDeviceScan, Error);
		} else if (device.isIos) {
			//bluetoothle.list(Bluetooth.onDevicesFound, Error);
		}
	},

	onDeviceScan: function(devices) {
		if (devices.status != "scanResult") { return; }



		if (typeof devices == "object" && typeof devices.address != "undefined") {
			devices = [devices];
		}

		for (var i = 0; i<devices.length; i++) {
			//console.log("Found device: ", devices[i]);

			if (devices[i].name == "BLE UART") {
				bluetoothle.stopScan();
				Bluetooth.onFoundBleUart(devices[i]);
			}
		}
	},

	onFoundBleUart: function(device) {
		console.log("Found BLE UART: ", device);
        Log("Inititiating connection...");
        Bluetooth.connect(device.address);

	},

	connect: function(address) {
		Log("Connecting to " + address);
		bluetoothle.connect(function() {
			console.log("Successfully connected to", address);

            if (device.isAndroid) {
                bluetoothle.discover(function(services) {
                    console.log("Discovered services: ", services);
                    Log("Listening to " + address);
                    /*
                    for(var i=0; i<services.length; i++) {
                        if (services[i].serviceUuid == "6e400002-b5a3-f393-e0a9-e50e24dcca9e") {
                            for (var j=0; j<services[i].characteristics.length; j++) {
                                if (services[i].characteristics[j].characteristicUuid == "6e400003-b5a3-f393-e0a9-e50e24dcca9e") {
                    */
                                    bluetoothle.subscribe(Bluetooth.onReceivedData, Error, {
                                        "address": address,
                                        serviceUuid:        "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
                                        characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
                                        isNotification: true
                                    });
                    /*
                                    return;
                                }
                            }
                        }
                    }*/
                }, Error, { address: address });
            } else if (device.isIos) {

            }


		}, Error, { address: address });

	},

	onReceivedData: function(data) {
        if (data.status == "subscribedResult") {
            var value = atob(data.value).trim();
            //console.log("Received data: ", value);
            if (typeof Bluetooth.onReceivedDataHandler == "function") {
                Bluetooth.onReceivedDataHandler(value);
            }
        }
	}
};
