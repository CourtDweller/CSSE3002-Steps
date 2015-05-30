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

	$stateProvider.state('doublestep', {
		url: "/doublestep",
		templateUrl: "views/doublestep.html"
	});

	$stateProvider.state('calls', {
			url: "/calls",
			templateUrl: "views/calls.html"
	});

	$stateProvider.state('balanceWarmup', {
		url: "/balanceWarmup",
		templateUrl: "views/balanceWarmup.html"
	});

	$stateProvider.state('balance', {
		url: "/balance",
		templateUrl: "views/balance.html"
	});

	$stateProvider.state('alarm', {
		url: "/alarm",
		controller: 'AlarmCtrl',
		templateUrl: "views/alarm.html"
	});

	$stateProvider.state('mediaPlayer', {
			url: "/mediaPlayer",
			templateUrl: "views/mediaPlayer.html"
	});


	$stateProvider.state('bluetooth', {
			url: "/bluetooth",
			templateUrl: "views/bluetooth.html"
	});


	$urlRouterProvider.otherwise('/doublestep');
})

.controller('AlarmCtrl', function($scope, $ionicPlatform) {
	var alarmTimer = null;
	var alarmSound = null;

	$scope.alarm = {
		started: false,
		time: null,
		timeToGo: null
	};

	$scope.setTime = function() {
		TimePicker.show(function(time) {
			var today = new Date();
			var now = parseInt(today.getHours() + "" + pad(today.getMinutes(), 2));
			var alarm = parseInt(time.hour + pad(time.minute, 2));
			var isAlarmTomorrow = 0;
			if (alarm < now) {
				// alarm time is less than current time, so set alarm for tomrrow
				isAlarmTomorrow = 1;
			}
			$scope.alarm.time = new Date(today.getFullYear(), today.getMonth(), today.getDate()+isAlarmTomorrow, time.hour, time.minute);
			$scope.$apply();
			$scope.startAlarm();
		}, function(error) {
			console.error("error", error);
		});
	};

	$scope.startAlarm = function() {
		$scope.alarm.started = true;
		$scope.$apply();
		alarmTimer = setInterval(alarmTick, 5000);
		alarmTick();
		function alarmTick() {
			var now = new Date().valueOf();
			var alarm = $scope.alarm.time.valueOf();
			var difference = alarm - now;
			if (difference <= 0) {
				$scope.alarm.timeToGo = -1;
				$scope.playAlarmSound();
				$scope.$apply();
				clearInterval(alarmTimer);
			} else {
				difference = difference / 1000 / 60 / 60;
				var hours = Math.floor(difference);
				var mins = Math.ceil((difference-hours)*60);
				$scope.alarm.timeToGo = hours + ":" + pad(mins, 2);
				$scope.$apply();
			}
		}
	};

	$scope.stopAlarm = function() {
		if (alarmSound === null) {
			// alarm is not going off, so we can stop
			clearInterval(alarmTimer);
			$scope.alarm.started = false;
			$scope.$apply();
		} else {
			console.log("don't stop the alarm");
		}

	};

	$scope.playAlarmSound = function() {
		if (alarmSound !== null) {
			$scope.stopAlarmSound();
		}
		alarmSound = new Media("/android_asset/www/alarm.mp3", null, function (err) {
				var errors = {};
				errors[MediaError.MEDIA_ERR_ABORTED] = "MEDIA_ERR_ABORTED";
				errors[MediaError.MEDIA_ERR_NETWORK] = "MEDIA_ERR_NETWORK";
				errors[MediaError.MEDIA_ERR_DECODE] = "MEDIA_ERR_DECODE";
				errors[MediaError.MEDIA_ERR_NONE_SUPPORTED] = "MEDIA_ERR_NONE_SUPPORTED";
				console.error("playAudio():Audio Error: ", errors[err.code]);
			}
		);

		alarmSound.play();
		alarmSound.setVolume(1.0);
		// this timer repeats the alarm tone indefinately
		var alarmSoundTimer = setInterval(function() {
			if (alarmSound === null) {
				clearInterval(alarmSoundTimer);
			} else {
				alarmSound.getCurrentPosition(function(position) {
					if (parseFloat(position) > alarmSound.getDuration() - 2) {
						alarmSound.seekTo(1000);
					}
				});
			}
		}, 1000);
	};

	$scope.stopAlarmSound = function() {
		alarmSound.stop();
		alarmSound.release();
		alarmSound = null;
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
			if (readings.length === 0) {
				setTimeout(function() {
					var avg = 0;
					for (var i=0; i<readings.length; i++) {
						avg += i<rreadings[i];
					}
					balanceAvg = avg/readings.length;
				}, 2000);
			}
			lastReading = value;

			if (balanceAvg === null) {
				readings.push(value);
			} else {
				if (value > balanceAvg*1.2 || value < balanceAvg*0.8) {
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
