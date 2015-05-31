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
		controller: 'CallsCtrl',
		templateUrl: "views/calls.html"
	});

	$stateProvider.state('balanceWarmup', {
		url: "/balanceWarmup",
		templateUrl: "views/balanceWarmup.html"
	});

	$stateProvider.state('balance', {
		url: "/balance",
		controller: 'BalanceCtrl',
		templateUrl: "views/balance.html"
	});

	$stateProvider.state('alarm', {
		url: "/alarm",
		controller: 'AlarmCtrl',
		templateUrl: "views/alarm.html"
	});

	$stateProvider.state('mediaPlayer', {
		url: "/mediaPlayer",
		controller: 'MediaPlayerCtrl',
		templateUrl: "views/mediaPlayer.html"
	});


	$stateProvider.state('bluetooth', {
		url: "/bluetooth",
		templateUrl: "views/bluetooth.html"
	});


	$urlRouterProvider.otherwise('/doublestep');
})

.controller('CallsCtrl', function($scope, $ionicPlatform) {
	$scope.calls = {
		started: false,
		phoneState: "IDLE" // RINGING, OFFHOOK or IDLE
	};

	$scope.start = function() {
		$scope.calls.started = true;

		DoublestepSdk.init();

		DoublestepSdk.bind("DoubleBackTap", function() {
			if ($scope.calls.phoneState == "RINGING") {
				PhoneAttendant.declineCall(function(success) {
					console.log("Phone call declined");
				}, function(error) {
					console.error("Could not decline phone call: ", error);
				});
			}
		});

		PhoneCallTrap.onCall(function(state) {
			$scope.calls.phoneState = state;
		});
	};

	$scope.stop = function() {
		$scope.calls.started = false;
		DoublestepSdk.unbindAll();
		PhoneCallTrap.onCall(function() {});
	};
})

.controller('MediaPlayerCtrl', function($scope, $ionicPlatform) {
	var isPaused = false;

	$scope.mediaPlayer = {
		started: false
	};

	$scope.start = function() {
		$scope.mediaPlayer.started = true;

		DoublestepSdk.init();

		DoublestepSdk.bind("FrontTap", function() {
			console.log("previous");
			MediaController.previous();
		});

		DoublestepSdk.bind("BackTap", function() {
			console.log("next");
			MediaController.next();
		});

		DoublestepSdk.bind("DoubleFrontTap", function() {
			console.log("stop");
			MediaController.stop();
		});

		DoublestepSdk.bind("DoubleBackTap", function() {
			console.log("pause/play");
			if (isPaused) {
				isPaused = false;
				MediaController.play();
			} else {
				isPaused = true;
				MediaController.pause();
			}
		});
	};

	$scope.stop = function() {
		$scope.mediaPlayer.started = false;
		DoublestepSdk.unbindAll();
	};
})

.controller('BalanceCtrl', function($scope, $ionicPlatform, $ionicHistory) {
	$scope.balance = {
		timeElapsed: "0:00",
		canRestart: false
	};

	$scope.restart = function() {
		$ionicHistory.goBack();
	};

	$ionicPlatform.ready(function() {
		var readings = [];
		var balanceAvg = null;
		var lastReading = null;
		var timer = null;
		var secondsElapsed = 0;

		DoublestepSdk.init();
		DoublestepSdk.bind("ReceivedReading", function(value) {
			if (readings.length === 0) {
				setTimeout(function() {
					var avg = 0;
					for (var i=0; i<readings.length; i++) {
						avg += readings[i];
					}
					balanceAvg = avg/readings.length;
					timer = setInterval(function() {
						secondsElapsed++;
						$scope.balance.timeElapsed = Math.floor(secondsElapsed/60) + ":" + pad((secondsElapsed % 60), 2);
						$scope.$apply();
					}, 1000);
				}, 1000);
			}
			lastReading = value;

			if (balanceAvg === null) {
				readings.push(value);
			} else {
				if (/*value > balanceAvg*1.2 || */value < balanceAvg*0.2) {
					$scope.balance.canRestart = true;
					$scope.$apply();
					angular.element(document.querySelector("#balanceMarker")).css({
						"transform": "translate3d(0, 0, 0)",
						"-webkit-transform": "translate3d(0, 0., 0)"
					});

					DoublestepSdk.unbind("ReceivedReading");
					clearInterval(timer);
					//DoublestepSdk.simulate.stop();

					alert("You lasted " + $scope.balance.timeElapsed);
				} else {
					var percentageDifference = 100*value/balanceAvg - 100;
					angular.element(document.querySelector("#balanceMarker")).css({
						"transform": "translate3d(0, "+percentageDifference+"%, 0)",
						"-webkit-transform": "translate3d(0, "+percentageDifference+"%, 0)"
					});
				}
			}
		});

		//DoublestepSdk.simulate.startVariedData(500, 10);
	});
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
	});
});



function pad(num, size) {
	var s = num+"";
	while (s.length < size) s = "0" + s;
	return s;
}
