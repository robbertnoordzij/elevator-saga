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
            
            var requests = {
                'up': [],
                'down': []
            };
            
            var requestElevator = function (floorNum, direction) {
                for (var i in elevators) {
                    var elevator = elevators[i];
                    
                    if (elevator.couldStopAtFloor(floorNum, direction)) {
                        elevator.goToFloor(floorNum);
                        return;
                    }
                }
                
                requests[direction].push(floorNum);
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
                
                var goToFloor = function (floorNum, force) {
                    force = force || false;
                    
                    if (force || elevator.destinationQueue.length === 0) {
                        direction = floorNum > currentFloor ? Direction.UP : Direction.DOWN;
                        elevator.goToFloor(floorNum, true);
                        return;
                    }
                    
                    elevator.goToFloor(floorNum);
                };
                
                var couldStopAtFloor = function (floorNum, requestedDirection) {
                    if (direction === Direction.IDLE) {
                        return true;
                    }
                    
                    if (elevator.loadFactor() > 0.8) {
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
                
                var onIdle = function () {
                    direction = Direction.IDLE;
                    
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(true);
                };
                
                var onFloorButtonPressed = function (floorNum) {
                    goToFloor(floorNum);
                };
                
                var onPassingFloor = function (floorNum, direction) {
                    currentFloor = floorNum;
                    
                    if (couldStopAtFloor(floorNum, direction) && shouldStopAtFloor(floorNum, direction)) {
                        goToFloor(floorNum, true);
                    }
                };
                
                var onStoppedAtFloor = function (floorNum) {
                    currentFloor = floorNum;
                    
                    shouldStopAtFloor(currentFloor, direction);
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
