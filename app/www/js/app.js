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
	})
	
	$stateProvider.state('kelly', {
		url: "/kelly",
		templateUrl: "views/kelly.html"
	})

	$urlRouterProvider.otherwise('/ble');
})


.controller('BleCtrl', function($scope, $ionicPlatform) {
	
	$scope.messages = [];
	
    $ionicPlatform.ready(function() {
	
		DoublestepSdk.init();
		
		DoublestepSdk.bind("ReceivedReading", function(value) {
			//console.log("RECEIVED READING: "+value);
		});
		
		DoublestepSdk.bind("FrontTap", function() {
			$scope.messages.push("FRONT TAP");
			$scope.$apply();
		});
		
		DoublestepSdk.bind("BackTap", function() {
			$scope.messages.push("BACK TAP");
			$scope.$apply();
		});
		
		DoublestepSdk.bind("DoubleFrontTap", function(value) {
			$scope.messages.push("DOUBLE FRONT TAP");
			$scope.$apply();
		});
		
		DoublestepSdk.bind("DoubleBackTap", function(value) {
			$scope.messages.push("DOUBLE BACK TAP");
			$scope.$apply();
		});
	
		//AlarmClock.setAlarm(null);
	
		/*
		MediaController.stop();
		MediaController.next();
		MediaController.previous();
		MediaController.pause();
		MediaController.play();
		*/

		/*
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
		*/
			
        
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
