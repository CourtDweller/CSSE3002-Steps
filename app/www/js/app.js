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
    var rangeHigh = 0;
    var rangeLow = 1023;
    var numReadings = 20;
    var buffer = 60; //amount to add to range
    var tapBuffer = 10;
    var checkHeelTap = false;
    var checkToeTap = false;
    var heelTapValue = 1023;
    var toeTapValue = 0;
    var heelTapTime = 0;
    var toeTapTime = 0;
    var date = new Date();
    var breakTime = 700;
    var tapExpiry = 1000;
    var minPressure = 70;
    var sitPresure = 100;
    var standPressure = 600;
    var doubleTapTime = 0;
	
    $ionicPlatform.ready(function() {
	
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
			
        // start the bluetooth communication
        Bluetooth.start();
        Bluetooth.onReceivedDataHandler = function(value) {
            //console.log("Value: " + value);
            //console.log("Range High: " + rangeHigh);
            //Think this might be a heel tap
            //$scope.messages.push("Hello");
            //$scope.$apply();
            
            date = new Date();
            if(readings.length < numReadings) {
                readings.push(value);
                console.log("getting initial num readings: " + readings.length);
            } else { 
                if(checkHeelTap) {
                    //console.log("checkTap true")
                    if(value > rangeHigh) {
                        heelTapValue = value;
                        if((date.getTime() - heelTapTime) < breakTime) {
                            $scope.messages.push("Double tap");
                            $scope.$apply();
                        }
                        heelTapTime = date.getTime();
                        $scope.messages.push("Heel tap: " + heelTapTime + " Val: " + heelTapValue);
                        $scope.$apply();
                        //console.log("Should have said Tap");
                        //Didn't add this one to readings array
                    }
                    rangeHigh = 0;
                    rangeLow = 1023;
                    checkHeelTap = false;
                    //Think this might be a toe tap
                } else if(checkToeTap) {
                    if(value < rangeLow) {
                        toeTapValue = value;
                        if((date.getTime() - toeTapTime) < breakTime) {
                            $scope.messages.push("Double tap");
                            $scope.$apply();
                            doubleTapTime = date.getTime();
                        }
                        toeTapTime = date.getTime();
                        $scope.messages.push("Toe tap: " + toeTapTime + " Val: " + toeTapValue);
                        $scope.$apply();
                    }
                    rangeHigh = 0;
                    rangeLow = 1023;
                    checkToeTap = false;
                    //Could be residual readings from heel tap
                } else if((date.getTime() <= heelTapTime + tapExpiry) && heelTapValue != -1 && value > (parseInt(heelTapValue) - tapBuffer)) {
                    console.log("still tapping - heel");
                    rangeHigh = 0;
                    //Could be residual readings from toe tap
                } else if((date.getTime() <= (toeTapTime + tapExpiry)) && heelTapValue != -1 && value < (parseInt(toeTapValue) + tapBuffer)) {
                    console.log("still tapping - toe");
                    rangeLow = 1023;
                    //Think foot is stationery
                } else {
                    heelTapValue = 1023;
                    toeTapValue = 0;
                    rangeHigh = 0;
                    rangeLow = 1023;
                    //console.log("not readings.length < numReadings")
                    for (var i = 0; i < (numReadings-1); i++) {
                        if (rangeHigh < parseInt(readings[i]) + buffer) {
                            rangeHigh = Math.min(parseInt(readings[i]) + buffer, 190);
                            //console.log("range High: " + rangeHigh + " i is: " + i);
                        }
                        if (rangeLow > parseInt(readings[i]) - buffer) {
                            rangeLow = Math.max(parseInt(readings[i]) - buffer, minPressure);
                            //console.log("range Low: " + rangeLow + " i is: " + i);
							
                        }
                        readings[i] = readings[i+1];
                    }
                    //console.log("Range Low: " + rangeLow);
                    //console.log("Value: " + value);
                    readings[numReadings-1] = value;
                    if(value > rangeHigh) {
                        checkHeelTap = true;
                        //console.log("Check tap is now true");
                    } else if(value < rangeLow) {
                        checkToeTap = true;
                    } else {
                        //console.log("Notap pushing");
                        //$scope.messages.push("NoTap: " + value);
                        //$scope.messages.push("High: " + rangeHigh);
                        //$scope.$apply();
                    }
                }
            }
        };
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
