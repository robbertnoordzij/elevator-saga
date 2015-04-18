{
    init: function(elevators, floors) {
        var MainController = (function () {
            var Direction = {
                UP: "up",
                DOWN: "down",
                IDLE: "idle"
            };
           
            var floors = [];
            
            var elevators = [];
            
            var floorListeners = [];
            
            var requests = {
                'up': [],
                'down': []
            };
            
            var requestElevator = function (floorNum, direction) {
                requests[direction].push(floorNum);
            };
            
            /*
             * @TODO clean up
             */
            var registerFloorListener = function (callback) {
                var floors = requests.up.concat(requests.down);
                
                if (floors.length > 0) {
                    callback(Math.max.apply(Math, floors));
                    return;
                }
                
                for (var i in floorListeners) {
                   if (floorListeners[i] === callback) {
                       return false;
                   }
                }
                
                floorListeners.push(callback);
            };
            
            var unRegisterFloorListener = function (callback) {
                for (var i in floorListeners) {
                    if (floorListeners[i] === callback) {
                        floorListeners.splice(i, 1);
                    }
                }
            };
            
            var shouldStopAtFloor = function (floorNum, direction) {
                if (direction === Direction.IDLE) {
                    return true;
                }
                
                if ((index = requests[direction].indexOf(floorNum)) === -1) {
                    return false;
                }
                
                requests[direction].splice(index, 1);
                
                return true;
            };
            
            var registerFloor = function (floor) {
                floors.push(new Floor(floor));
            };
            
            var registerElevator = function (elevator) {
                elevators.push(new Elevator(elevator));
            };
            
            /*
             * Basic wrapper for custom events etc.
             */
            var Floor = function (floor) {
                var onUpButtonPressed = function () {
                    requestElevator(floor.floorNum(), Direction.UP);
                };
                
                var onDownButtonPressed = function () {
                    requestElevator(floor.floorNum(), Direction.DOWN);
                };
                
                floor.on('up_button_pressed', onUpButtonPressed);
                floor.on('down_button_pressed', onDownButtonPressed);
            };
            
            /*
             * Basic wrapper for custom events etc.
             */
            var Elevator = function (elevator) {
                var direction = Direction.IDLE;
                
                var currentFloor = elevator.currentFloor();
                
                var queuedDestinations = [];
                
                var floorListener = function (floorNum) {
                    goToFloor(floorNum);
                };
                
                var goToFloor = function (floorNum, force) {
                    unRegisterFloorListener(floorListener);
                    
                    if (currentFloor === floorNum) {
                        return;
                    }
                    
                    force = force || false;
                    
                    if (force || elevator.destinationQueue.length === 0) {
                        direction = floorNum >= currentFloor ? Direction.UP : Direction.DOWN;
                        
                        elevator.goingUpIndicator(direction === Direction.UP);
                        elevator.goingDownIndicator(direction === Direction.DOWN);
                        
                        elevator.goToFloor(floorNum, true);
                        return;
                    }
                    
                    if (queuedDestinations.indexOf(floorNum)) {
                        queuedDestinations.push(floorNum);
                    }
                };
                
                var couldStopAtFloor = function (floorNum, requestedDirection) {
                    if (direction === Direction.IDLE) {
                        return true;
                    }
                    
                    if (elevator.loadFactor() > 0.9) {
                        return false;
                    }
                    
                    if (direction === requestedDirection) {
                        var couldStop = (direction === Direction.UP ? (currentFloor <= floorNum) : (currentFloor >= floorNum));
                        
                        if (couldStop) {
                            return true;
                        }
                    }
                    
                    return false;
                };
                
                var goToQueuedDestination = function () {
                    var floorNum = 0;
                    
                    if (direction === Direction.UP && queuedDestinations.length > 0) {
                        floorNum = Math.max.apply(Math, queuedDestinations);
                    }
                    
                    if (direction === Direction.DOWN && queuedDestinations.length > 0) {
                        floorNum = Math.min.apply(Math, queuedDestinations);
                    }
                    
                    if (floorNum !== false && floorNum !== currentFloor) {
                        goToFloor(floorNum, true);
                    }
                };
                
                var onIdle = function () {
                    direction = Direction.IDLE;
                    
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(true);
                    
                    registerFloorListener(floorListener);
                };
                
                var onFloorButtonPressed = function (floorNum) {
                    goToFloor(floorNum);
                };
                
                var onPassingFloor = function (floorNum, direction) {
                    currentFloor = floorNum;
                    
                    if (queuedDestinations.indexOf(floorNum) !== -1) {
                        goToFloor(floorNum, true);
                    }
                    
                    if (couldStopAtFloor(floorNum, direction) && shouldStopAtFloor(floorNum, direction)) {
                        goToFloor(floorNum, true);
                    }
                };
                
                var onStoppedAtFloor = function (floorNum) {
                    currentFloor = floorNum;
                    
                    shouldStopAtFloor(currentFloor, direction);
                    
                    if ((index = queuedDestinations.indexOf(floorNum)) !== -1) {
                        queuedDestinations.splice(index, 1);
                    }
                    
                    if (queuedDestinations.length !== 0) {
                        goToQueuedDestination();
                        return;
                    }
                    
                    if (elevator.destinationQueue.length === 0) {
                        onIdle();
                    }
                }
                
                this.goToFloor = goToFloor;
                this.couldStopAtFloor = couldStopAtFloor;
                
                elevator.on('idle', onIdle);
                elevator.on('floor_button_pressed', onFloorButtonPressed);
                elevator.on('passing_floor', onPassingFloor);
                elevator.on('stopped_at_floor ', onStoppedAtFloor);
            };
            
            return {
                registerElevator: registerElevator,
                registerFloor: registerFloor
            }
        })();

        elevators.forEach(function (elevator) {
            MainController.registerElevator(elevator);
        });

        floors.forEach(function (floor) {
            MainController.registerFloor(floor);
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
