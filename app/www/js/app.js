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

	$stateProvider.state('functions', {
		url: "/functions",
		templateUrl: "views/functions.html"
	})
	
	$stateProvider.state('doublestep', {
		url: "/doublestep",
		templateUrl: "views/doublestep.html"
	})
	
	$stateProvider.state('balanceWarmup', {
		url: "/balanceWarmup",
		templateUrl: "views/balanceWarmup.html"
	})
	
	$stateProvider.state('alarm', {
		url: "/alarm",
		controller: 'AlarmCtrl',
		templateUrl: "views/alarm.html"
	});
	
	

	$urlRouterProvider.otherwise('/ble');
})

.controller('AlarmCtrl', function($scope, $ionicPlatform) {
	var alarmTimer = null;
	$scope.alarm = {time: new Date()};
	$scope.alarmRunning = false;
	
	$scope.timeSet = function() {
		var time = parseInt($scope.alarm.time.getHours() + "" + pad($scope.alarm.time.getMinutes(), 2));
		console.log(time);
	};
	
	$scope.startAlarm = function() {
		$scope.alarmRunning = true;
		alarmTimer = setInterval(function() {
			
		}, 5000);
		
		$scope.playAlarm();
	};
	
	$scope.stopAlarm = function() {
		$scope.alarmRunning = false;
	};
	
	$scope.playAlarm = function() {
		var my_media = new Media("alarm.mp3",
        // success callback
        function () {
            console.log("playAudio():Audio Success");
        },
        // error callback
        function (err) {
            console.log("playAudio():Audio Error: " + err);
        }
		);
		// Play audio
		my_media.play();
	};
})

.controller('BleCtrl', function($scope, $ionicPlatform) {
	
	$scope.messages = [];
	
    $ionicPlatform.ready(function() {
	
		DoublestepSdk.init();
		
		// assuming balance mode
		var readings = [];
		var balanceAvg = null;
		var lastReading = null;
		
		DoublestepSdk.bind("ReceivedReading", function(value) {
			//console.log("RECEIVED READING: "+value);
			if (readings.length == 0) {
				setTimeout(function() {
					var avg = 0;
					for (var i=0; i<readings.length; i++) {
						avg += i<rreadings[i];
					}
					balanceAvg = avg/readings.length;
				}, 2000);
			}
			lastReading = value;
			
			if (balanceAvg == null) {
				readings.push(value);
			} else {
				if (value > balanceAvg*1.2 || value < balanceAvg*.8) {
					alert("you suck");
				} else {
					$scope.balancePercentage = 100*value/1023;
					//$scope.balancePercentage = 100*value/balanceAvg;
					$scope.$apply();
				}
			}
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



function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
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
