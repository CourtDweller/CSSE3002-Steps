// Ionic Starter App

var ionicNavBarDelegate = null;

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var Doublestep = angular.module('Doublestep', ['ionic'])

// first-run configuration for teh ionic framework
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

		// if we've previously conected to a device, get it's bluetooth device
		DoublestepSdk.bluetooth.options.connectTo = localStorage.getItem("doublestepDevice");
	});
})

// configuration of the ionic framework
// defines the routing of the MVC framework
.config(function($ionicConfigProvider, $stateProvider, $urlRouterProvider) {
	// center the title
	$ionicConfigProvider.navBar.alignTitle('ios');

	// route for the main home page
	$stateProvider.state('doublestep', {
		url: "/doublestep",
		controller: 'DoublestepCtrl',
		templateUrl: "views/doublestep.html"
	});

	// route for the calls function
	$stateProvider.state('calls', {
		url: "/calls",
		controller: 'CallsCtrl',
		templateUrl: "views/calls.html"
	});

	// route for the balance functino (the pre-balanace page)
	$stateProvider.state('balanceWarmup', {
		url: "/balanceWarmup",
		templateUrl: "views/balanceWarmup.html"
	});

	// route for the balance function (the actual balance page)
	$stateProvider.state('balance', {
		url: "/balance",
		controller: 'BalanceCtrl',
		templateUrl: "views/balance.html"
	});

	// route for the alarm page
	$stateProvider.state('alarm', {
		url: "/alarm",
		controller: 'AlarmCtrl',
		templateUrl: "views/alarm.html"
	});

	// route for the media player page
	$stateProvider.state('mediaPlayer', {
		url: "/mediaPlayer",
		controller: 'MediaPlayerCtrl',
		templateUrl: "views/mediaPlayer.html"
	});

	// route for the bluetooth configuration page
	$stateProvider.state('bluetooth', {
		url: "/bluetooth",
		controller: 'BluetoothCtrl',
		templateUrl: "views/bluetooth.html"
	});

	// if no route has been matched so far, go to the main doubelstep route
	$urlRouterProvider.otherwise('/doublestep');
})

// Controller for the main page
.controller('DoublestepCtrl', function($scope, $ionicPlatform, $state) {
	//wait for the ionic platform to become available
	$ionicPlatform.ready(function() {
		// if a doublestep has been configured, we should be getting its address
		var device = localStorage.getItem("doublestepDevice");


		if (!device) {
			// no doublestep was configured, so welcome the user and send them to the bluetooth config page
			alert("Welcome to the Doublestep Demo app!\nLet's start by connecting to the Doublestep.");
			$state.go("bluetooth");
		} else {
			// a previous doublestep was configured, so connect to it
			DoublestepSdk.bluetooth.options.connectTo = device;
			DoublestepSdk.init();
		}
	});
})

// Controller for the bluetooth configuration page
.controller('BluetoothCtrl', function($scope, $ionicPlatform) {

	// define an empty array of scanned doublesteps
	$scope.devicesFoundAddress = {};
	$scope.devicesFound = [];

	// get any currently configured doublestep
	$scope.savedDevice = localStorage.getItem("doublestepDevice");

	// Set (configure) the app to use the specified doublestepp
	$scope.setDevice = function(address) {
		// save the doubleste's bluetooth address and update the scope and sdk
		localStorage.setItem("doublestepDevice", address);
		$scope.savedDevice = address;
		DoublestepSdk.bluetooth.options.connectTo = address;
		// stop scanning for more doublesteps
		DoublestepSdk.stop(function() {
			// initialise the sdk and setup bindings
			// (we're in a timeout because sometimes we need to give the app some
			// extra time)
			setTimeout(function() {
				DoublestepSdk.init();
				setupBinding();
			}, 1000);
		});

	};

	// wait for the ionic platform to be ready
	$ionicPlatform.ready(function() {
		// disable auto connecting to any already configuerd doublsteps.
		DoublestepSdk.bluetooth.options.autoconnect = false;
		// stop scanning for any doublesteps
		DoublestepSdk.stop(function() {
			// make sure we havent got any doublesteps pre configured
			DoublestepSdk.bluetooth.options.connectTo = null;
			// initialise the sdk and setup bindings
			// (we're in a timeout because sometimes we need to give the app some
			// extra time)
			setTimeout(function() {
				DoublestepSdk.init();
				setupBinding();
			}, 1000);
		});
	});

	// Defined what should be done when the SDK finds a doublestep
	function setupBinding() {
		// bind to the "found doublestep" event
		DoublestepSdk.bind("FoundBleDoublestep", function(device) {
			// a doublestep was found to be in range.
			if (typeof $scope.devicesFoundAddress[device.address] == "undefined") {
				// we havent seen this doublestep before, so add it to our
				// list of found devices.
				$scope.devicesFoundAddress[device.address] = $scope.devicesFound.length;
				$scope.devicesFound.push(device);
				$scope.$apply();
			}
		});
	}
})

// Controller for the calls page
.controller('CallsCtrl', function($scope, $ionicPlatform) {
	// define some variables
	$scope.calls = {
		started: false, // is this mode enabled or not
		phoneState: "IDLE" // state of the phone - RINGING, OFFHOOK or IDLE
	};

	// Starts listening for phone calls
	$scope.start = function() {
		$scope.calls.started = true;

		// remove existing and setup new doublestep event handlers
		DoublestepSdk.unbindAll();

		DoublestepSdk.bind("LongBackTap", function() {
			// a long back tap was detected - is the phone ringing?
			if ($scope.calls.phoneState == "RINGING") {
				// yes, phone is rinhing, so decline the call
				PhoneAttendant.declineCall(function(success) {
					console.log("Phone call declined");
				}, function(error) {
					console.error("Could not decline phone call: ", error);
				});
			}
		});

		// update our phone state variable when the state of the phone is changed.
		PhoneCallTrap.onCall(function(state) {
			$scope.calls.phoneState = state;
		});
	};

	// stop listening for phone calls
	$scope.stop = function() {
		//update vars, and unbind all event handlers
		$scope.calls.started = false;
		DoublestepSdk.unbindAll();
		PhoneCallTrap.onCall(function() {});
	};
})

// controller for the media controller page
.controller('MediaPlayerCtrl', function($scope, $ionicPlatform) {
	// define some vars
	var isPaused = false; // is the current song paused
	$scope.mediaPlayer = {
		started: false // is this mode enabled?
	};

	// start controlling media
	$scope.start = function() {
		$scope.mediaPlayer.started = true;

		// remove any existing event handlers
		DoublestepSdk.unbindAll();

		// go back to the last song on a back tap
		DoublestepSdk.bind("BackTap", function() {
			console.log("Media - Previous");
			MediaController.previous();
		});

		// go to the next song on a front tap
		DoublestepSdk.bind("FrontTap", function() {
			console.log("Media - Next");
			MediaController.next();
		});

		// pause/play (toggle) the current song on a long back tap
		DoublestepSdk.bind("LongBackTap", function() {
			console.log("Media - Pause/Play");
			if (isPaused) {
				isPaused = false;
				MediaController.play();
			} else {
				isPaused = true;
				MediaController.pause();
			}
		});
	};

	// Stop controller media
	$scope.stop = function() {
		// remove all event handlers
		$scope.mediaPlayer.started = false;
		DoublestepSdk.unbindAll();
	};
})

// controller for balance page
.controller('BalanceCtrl', function($scope, $ionicPlatform, $ionicHistory) {
	// set some vars
	$scope.balance = {
		timeElapsed: "0:00", // how long have we ben balanced for
		canRestart: false // should we be able to restart? (only after they have failed)
	};

	// restart the balance game/test
	$scope.restart = function() {
		$ionicHistory.goBack();
	};

	// wait for the ionic platform to be ready
	$ionicPlatform.ready(function() {
		// set some vars
		var readings = []; // a collection of the first set of readings of the sensor - used for averaging
		var balanceAvg = null; // the person's average sensor reading
		var lastReading = null; // the persons most recent sensor reading
		var timer = null; // the stopwatch timer indicating how long the user has been balanced
		var secondsElapsed = 0; // how many seconds the user has been balanced

		// remove any existing event handlers
		DoublestepSdk.unbindAll();
		// bind to the "recevied reading" event
		DoublestepSdk.bind("ReceivedReading", function(value) {
			// have we collected any readings yet?
			if (readings.length === 0) {
				//  we havent collected any readings, so let's start collecting some for an average
				// after one second, we will stop collecting readings, and the following timeout will execute
				setTimeout(function() {
					// add up all readings so far
					var avg = 0;
					for (var i=0; i<readings.length; i++) {
						avg += readings[i];
					}
					// get the average
					balanceAvg = avg/readings.length;
					// start the stopwatch timer to count how long the user has been balanced for
					timer = setInterval(function() {
						// increlent some counters and set some values
						secondsElapsed++;
						$scope.balance.timeElapsed = Math.floor(secondsElapsed/60) + ":" + pad((secondsElapsed % 60), 2);
						$scope.$apply();
					}, 1000);
				}, 1000);
			}
			lastReading = value;

			// if we havent got an average yet, we mujst still be collecting
			// sensor readings to calculate an average
			if (balanceAvg === null) {
				// collect sensor reading
				readings.push(value);
			} else {
				// we have an average, so we must already be in-game

				// check if our balance is within tollerance
				if (/*value > balanceAvg*1.2 || */value < balanceAvg*0.6) {
					// nope - we are out of tollerence, so we must have lost balance
					// allow the user to resatart.
					$scope.balance.canRestart = true;
					$scope.$apply();

					// move the balance marker back to the middle
					angular.element(document.querySelector("#balanceMarker")).css({
						"transform": "translate3d(0, 0, 0)",
						"-webkit-transform": "translate3d(0, 0., 0)"
					});

					// stop listening for sensor readings and stop the timer
					DoublestepSdk.unbind("ReceivedReading");
					clearInterval(timer);

					// tell the user how long they lasted.
					alert("You lasted " + $scope.balance.timeElapsed);
				} else {
					// we're still within the tollerance - ie, we're still balancing

					// calculate the percentage difference between our current reading and the average.
					var percentageDifference = 100*value/balanceAvg - 100;
					// move the balance marker according to our sensor reading.
					angular.element(document.querySelector("#balanceMarker")).css({
						"transform": "translate3d(0, "+percentageDifference+"%, 0)",
						"-webkit-transform": "translate3d(0, "+percentageDifference+"%, 0)"
					});
				}
			}
		});
	});
})

// controller for the alarm page
.controller('AlarmCtrl', function($scope, $ionicPlatform) {
	// set some vars
	var alarmTimer = null; // timer to check time (ie to check if/when alarm should go off)
	var alarmSound = null; // the sound resource that is the alarm

	$scope.alarm = {
		started: false, // is this mode enabled
		time: null, // the time the alarm should go off
		timeToGo: null // how much time is left until the alam goes off.
	};

	// sets the time in which the alarm should go off.
	$scope.setTime = function() {
		// show the native android time picker
		TimePicker.show(function(time) {
			// get todays datetime and the time from the timepicker
			var today = new Date();
			var now = parseInt(today.getHours() + "" + pad(today.getMinutes(), 2));
			var alarm = parseInt(time.hour + pad(time.minute, 2));
			// check if the alarm is scheduled for later today, or some time tomorrow
			var isAlarmTomorrow = 0;
			if (alarm < now) {
				// alarm time is less than current time, so set alarm for tomrrow
				isAlarmTomorrow = 1;
			}
			// create the datetime object of the upcoming alarm,
			$scope.alarm.time = new Date(today.getFullYear(), today.getMonth(), today.getDate()+isAlarmTomorrow, time.hour, time.minute);
			$scope.$apply();
			// start the alarm timer
			$scope.startAlarm();
		}, function(error) {
			console.error("TimePicker Error: ", error);
		});
	};

	// starts the timer for the alarm
	$scope.startAlarm = function() {
		$scope.alarm.started = true; // the alarm timer has started
		$scope.$apply();

		// check the time every 5 seconds (also check it right now!)
		alarmTimer = setInterval(alarmTick, 5000);
		alarmTick();

		// checks if the alarm should go off
		function alarmTick() {
			// get the time now, and the time the alarm is suppoised to be going off
			var now = new Date().valueOf();
			var alarm = $scope.alarm.time.valueOf();
			// how long till the alarm is supposed to go off?
			var difference = alarm - now;
			if (difference <= 0) {
				// we are at (or have surpassed) the alarm time - we need to start buzzing!
				$scope.alarm.timeToGo = -1;
				$scope.playAlarmSound();
				$scope.$apply();
				// stop the alarm timer
				clearInterval(alarmTimer);
			} else {
				// we havent reached the alarm time yet
				// how loong do we have left? (in hours and also minutes)
				difference = difference / 1000 / 60 / 60;
				var hours = Math.floor(difference);
				var mins = Math.ceil((difference-hours)*60);
				// set the (visual) time to go
				$scope.alarm.timeToGo = hours + ":" + pad(mins, 2);
				$scope.$apply();
			}
		}
	};

	// stop the alarm timer
	$scope.stopAlarm = function() {
		// is the alarm sounding?
		if (alarmSound === null) {
			// no it's not, so we should be able to stop the alarm
			clearInterval(alarmTimer);
			$scope.alarm.started = false;
			$scope.$apply();
		} else {
			// alarm is already soudning, so they shouldn't be able to stop the
			// alarm without using the doublestep
			alert("Alarm must be disabled with the Doublestep!");
		}

	};

	// plays the alarm sound
	$scope.playAlarmSound = function() {
		// if the alarm is already sounding, stop it first
		if (alarmSound !== null) {
			$scope.stopAlarmSound();
		}

		// create the alarm sound object amd start playing it
		alarmSound = new Media("/android_asset/www/alarm.mp3", null, function (err) {
			// we had some errors. What were they?
			var errors = {};
			errors[MediaError.MEDIA_ERR_ABORTED] = "MEDIA_ERR_ABORTED";
			errors[MediaError.MEDIA_ERR_NETWORK] = "MEDIA_ERR_NETWORK";
			errors[MediaError.MEDIA_ERR_DECODE] = "MEDIA_ERR_DECODE";
			errors[MediaError.MEDIA_ERR_NONE_SUPPORTED] = "MEDIA_ERR_NONE_SUPPORTED";
			console.error("playAudio():Audio Error: ", errors[err.code]);
		});

		// play the alarm at max vilume
		alarmSound.play();
		alarmSound.setVolume(1.0);

		// this timer repeats the alarm tone indefinately (checks every 1 second)
		var alarmSoundTimer = setInterval(function() {
			// if the alarm was stopped, make sure we dont repeat it in this timer
			if (alarmSound === null) {
				clearInterval(alarmSoundTimer);
			} else {
				// check if the alarm tone is about to end
				alarmSound.getCurrentPosition(function(position) {
					if (parseFloat(position) > alarmSound.getDuration() - 2) {
						// repeat the alarm (rewind back to 1 second)
						alarmSound.seekTo(1000);
					}
				});
			}
		}, 1000);
	};

	// stop the alarm tone
	$scope.stopAlarmSound = function() {
		// if the alarm is sounding, stop it and release all system resources
		if (alarmSound !== null) {
			alarmSound.stop();
			alarmSound.release();
			alarmSound = null;
		}
	};

	// wait for the ionic platform to be ready
	$ionicPlatform.ready(function() {
		var readings = []; // collection of sensor readings (used for averaging)
		var alarmAvg = null; // the average sensor reading

		// remove any existing event handlers
		DoublestepSdk.unbindAll();
		// bind to the "receved reading" event
		DoublestepSdk.bind("ReceivedReading", function(value) {
			// do we have any readings yet?
			if (readings.length === 0) {
				// no we dont, so let's give it a second then take the average
				setTimeout(function() {
					// calculate the average of the most recent readings
					var avg = 0;
					for (var i=0; i<readings.length; i++) {
						avg += readings[i];
					}
					// set the average
					alarmAvg = avg/readings.length;
				}, 1000);
			}

			// no average is set, so we must still be colelcting sensor readings
			if (alarmAvg === null) {
				// collect the reading
				readings.push(value);
			} else {
				// yes, we have an average
				// check if the current reading is significantly larger than the average
				// (ie, we've stood up from suitting down)
				if (value > alarmAvg*1.5) {
					// yes, our reading is significantly changed, so stop the alarm tone and timer
					$scope.stopAlarmSound();
					$scope.stopAlarm();
				}
			}
		});
	});
});

// Pad an interger with leading zeros
function pad(num, size) {
	var s = num+"";
	while (s.length < size) s = "0" + s;
	return s;
}
