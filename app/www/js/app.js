// Ionic Starter App

var ionicNavBarDelegate = null;

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var Doublestep = angular.module('Doublestep', ['ionic'])

.run(function($ionicPlatform, $ionicNavBarDelegate) {
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
			};
		}

	});
})

.config(function($ionicConfigProvider, $stateProvider, $urlRouterProvider) {
	$ionicConfigProvider.navBar.alignTitle('ios');

	$stateProvider.state('ble', {
		url: "/ble",
		controller: 'BleCtrl',
		templateUrl: "views/ble.html"
	});

	$urlRouterProvider.otherwise('/ble');
})


.controller('BleCtrl', function($scope, $ionicPlatform) {
	$scope.messages = [];
	var readings = [];
	var rangeHigh = 1024;
	var rangeLow = 0;
	var numReadings = 50;
	var buffer = 100; //amount to add to range
	var checkTap = false;

    $ionicPlatform.ready(function() {
        // start the bluetooth communication
    	Bluetooth.start();
    	Bluetooth.onReceivedDataHandler = function(value) {
		if(checkTap) {
			if(value > rangeHigh) {
				$scope.messages.push("Tap");
				$scope.apply();
				//Didn't add this one to readings array
			}
			checkTap = false;
		} else {
		if(readings.length < numReadings) {
			readings.push(value);
		} else {
			
			for (var i = 0; i < (numReadings-1); i++) {
				if (rangeHigh < readings[i] + buffer) {
					rangeHigh = readings[i] + buffer;
				}
				if (rangeLow > readings[i] - buffer) {
					rangeLow = readings[i] - buffer;
				}
				readings[i] = readings[i+1];
				
			}
			readings[numReadings-1] = value;
		}
		if(value > rangeHigh) {
			checkTap = true;
		}
		
		$scope.messages.push("NoTap: " + value);
		$scope.apply();
		}
		//$scope.messages.push(value);
    		//$scope.$apply();
    	};
		
		PhoneCallTrap.onCall(function(state) {
			console.log("CHANGE STATE: " + state);
			
			switch (state) {
				case "RINGING":
					console.log("Phone is ringing");
					
					// TODO: Detect foot tap. For now, just set a timer
					setTimeout(function() {
						PhoneAttendant.declineCall(function(success) {
							console.log("success");
						}, function(error) {
							console.error(error);
						});
					}, 3000);
					
					break;
				case "OFFHOOK":
					console.log("Phone is off-hook");
					break;
				
				case "IDLE":
					console.log("Phone is idle");
					break;
			}
		});
    });
});





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
