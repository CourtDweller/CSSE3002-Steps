// Ionic Starter App

var ionicNavBarDelegate = null;

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

.config(function($ionicConfigProvider) {
    $ionicConfigProvider.navBar.alignTitle('ios');
})

.run(function($ionicPlatform, $rootScope, $ionicNavBarDelegate) {
    $ionicPlatform.ready(function() {

        // get a global copy of the nav bar delegate
        ionicNavBarDelegate = $ionicNavBarDelegate;

        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard for form inputs)
        if(window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }

        // set the style of the status bar
        if(window.StatusBar) {
            StatusBar.styleDefault();
        }

        // check what platform we're running on
        if (typeof device != "undefined") {
            device.isAndroid = (device.platform.toLowerCase() == "android");
            device.isIos = (device.platform.toLowerCase() == "ios");
        } else {
            // we're running on an unsupported platform (eg browser)
            window.device = {
                isAndroid: false,
                isIos: false
            }
        }

        $rootScope.messages = [];

        // start the bluetooth communication
        Bluetooth.start();
        Bluetooth.onDevicesFoundHandler = function(devices) {
            // LEO-PC   E0:B9:A5:9D:AE:81
            //Bluetooth.connect("E0:B9:A5:9D:AE:81");
        }
    });
})

var Bluetooth = {
    onReceivedDataHandler: null,
    onDevicesFoundHandler: null,

    start: function() {
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
            bluetoothle.startScan(Bluetooth.onDevicesFound, Error);
        } else if (device.isIos) {
            //bluetoothle.list(Bluetooth.onDevicesFound, Error);
        }
    },

    onDevicesFound: function(devices) {
        console.log(devices);
        /*
        if (devices.length == 0) {
            Log("No Bluetooth devices found");
        } else {
            Log("Found Bluetooth devices", devices);
            if (typeof Bluetooth.onDevicesFoundHandler == "function") {
                Bluetooth.onDevicesFoundHandler();
            }
        }
        */
        setTimeout(bluetoothle.stopScan, 1000);
    },

    connect: function(address) {
        Log("Connecting to", address);
        bluetoothle.connect(address, function() {
            console.log("Successfully connected to", address);
            bluetoothle.subscribe('\n', Bluetooth.onReceivedData, Error);
        }, Error);
    },

    onReceivedData: function(data) {
        Log("Received data", data);
        if (typeof Bluetooth.onReceivedDataHandler == "function") {
            Bluetooth.onReceivedDataHandler();
        }
    }
}

function Log() {
    if (typeof arguments[0] == "string") {
        ionicNavBarDelegate.title(arguments[0]);
    }
    var log = "console.log(";
    for (var i=0; i<arguments.length; i++) {
        log += "arguments["+i+"], ";
    }
    log = log.substring(0, log.length-2) + ")";
    eval(log);
}

function Error() {
    var error = "console.error(";
    for (var i=0; i<arguments.length; i++) {
        error += "arguments["+i+"], ";
    }
    error = error.substring(0, error.length-2) + ")";
    eval(error);
}
