{
    init: function(elevators, floors) {
        var Direction = {
            UP: "up",
            DOWN: "down",
            IDLE: "idle"
        };
        
        var Helper = (function () {
            var otherElevatorWillStop = function (elevator, floorNum, direction) {
                var elevators = MainController.getElevators();
            
                for (var i in elevators) {
                    if (elevator === elevators[i]) {
                        continue;
                    }
                    
                    elevator = elevators[i];
                    
                    if (elevator.getDirection() === direction || elevator.getDirection() === Direction.IDLE) {
                        if (elevator.hasDestinationOrWillPass(floorNum)) {
                            return true;
                        }
                    }
                }
                
                return false;
            };
            
            var processing = false;
            
            var determineDestination = function (elevator, requestedFloors) {
                var currentFloor = elevator.getCurrentFloor();
                
                if (processing) {
                    return currentFloor;
                }
                
                var closest = false;
                
                for (var i in requestedFloors) {
                    var floorNum = requestedFloors[i];
                    
                    if (currentFloor === floorNum) {
                        continue;
                    }
                    
                    if (closest === false || Math.abs(closest - currentFloor) > Math.abs(floorNum - currentFloor)) {
                        closest = floorNum;
                    }
                }
                
                if (closest === false) {
                    var requests = MainController.getRequests();
                    
                    for (var direction in requests) {
                        for (var i in requests[direction]) {
                            var floorNum = requests[direction][i];
                            
                            if (currentFloor === floorNum) {
                                continue;
                            }
                            
                            if (otherElevatorWillStop(elevator, floorNum, direction)) {
                                continue;
                            }
                            
                            if (closest === false || Math.abs(closest - currentFloor) > Math.abs(floorNum - currentFloor)) {
                                closest = floorNum;
                            }
                        }
                    }
                }
                
                if (closest === false) {
                    return currentFloor;
                }
                
                return closest;
            };
            
            var shouldStop = function (elevator, floorNum, direction) {
                var requests = MainController.getRequests();
                
                if (requests[direction].indexOf(floorNum) === -1) {
                    return false;
                }
                
                // Check if other elevator will stop here
                if (otherElevatorWillStop(elevator, floorNum, direction)) {
                    return false;
                }
                
                return true;
            };
            
            return {
                determineDestination: determineDestination,
                shouldStop: shouldStop
            };
        })();
        
        var MainController = (function () {
            var floors = [];

            var elevators = [];

            var requests = {
                'up': [],
                'down': []
            };
            
            var removeFloorFromRequests = function (floorNum, direction) {
                var direction = direction === Direction.IDLE ? false : direction;
                
                if (!direction || direction == Direction.UP) {
                    if ((index = requests.up.indexOf(floorNum)) !== -1) {
                        requests.up.splice(index, 1);
                    }
                }

                if (!direction || direction == Direction.DOWN) {
                    if ((index = requests.down.indexOf(floorNum)) !== -1) {
                        requests.down.splice(index, 1);
                    }
                }
            };

            var requestElevator = function (floorNum, direction) {
                requests[direction].push(floorNum);
            };
            
            var registerFloor = function (floor) {
                floors.push(new Floor(floor));
            };

            var registerElevator = function (elevator) {
                elevators.push(new Elevator(elevator));
            };
            
            var getRequests = function () {
                return requests;
            };
            
            var getElevators = function () {
                return elevators;
            };

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

            var Elevator = function (elevator) {
                var direction = Direction.IDLE;
                
                var currentDestination = false;

                var requestedFloors = [];
                
                var self = this;
                
                var getCurrentFloor = function () {
                    return elevator.currentFloor();
                };
                
                var getDirection = function () {
                    return direction;  
                };
                
                var hasDestinationOrWillPass = function (floorNum) {
                    if (currentDestination === floorNum && direction === Direction.IDLE) {
                        console.log("HELLO");
                        return true;
                    }
                    
                    if (elevator.currentFloor() === floorNum) {
                        return true;
                    }
                    
                    if (requestedFloors.indexOf(floorNum) !== -1) {
                        return true;
                    }
                    
                    if (elevator.destinationQueue.indexOf(floorNum) !== -1) {
                        return true;
                    }
                    
                    if (direction === Direction.UP) {
                        if (elevator.currentFloor() <= floorNum && floorNum <= currentDestination && elevator.loadFactor() < 0.5) {
                            return true;
                        }   
                    }

                    if (direction === Direction.DOWN) {
                        if (elevator.currentFloor() >= floorNum && floorNum >= currentDestination && elevator.loadFactor() < 0.5) {
                            return true;
                        }   
                    }
                    
                    return false;
                };

                var goToFloor = function (floorNum) {
                    elevator.destinationQueue = [];
                    
                    if (elevator.currentFloor() < floorNum) {
                        direction = Direction.UP;
                        
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);
                    } else if (elevator.currentFloor() > floorNum) {
                        direction = Direction.DOWN;
                        
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                    } else {
                        elevator.trigger('idle');
                    }
                    
                    currentDestination = floorNum;
                    
                    elevator.goToFloor(floorNum);
                };

                var onIdle = function () {
                    direction = Direction.IDLE;

                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(true);
                    
                    var floorNum = Helper.determineDestination(self, requestedFloors);
                    goToFloor(floorNum);
                };

                var onFloorButtonPressed = function (floorNum) {
                    if (requestedFloors.indexOf(floorNum) === -1) {
                        requestedFloors.push(floorNum);    
                    }
                };

                var onPassingFloor = function (floorNum, direction) {
                    if (requestedFloors.indexOf(floorNum) !== -1) {
                        elevator.goToFloor(floorNum, true);
                        return;
                    }
                    
                    // If people will be getting out here, allow stop
                    var loadFactorLimit = requestedFloors.indexOf(floorNum) !== -1 ? 1 : 0.7;
                    
                    if (elevator.loadFactor() < loadFactorLimit) {
                        if (Helper.shouldStop(self, floorNum, direction)) {
                            elevator.goToFloor(floorNum, true);    
                        }
                    }
                };

                var onStoppedAtFloor = function (floorNum) {
                    currentDestination = false;
                    
                    if ((index = requestedFloors.indexOf(floorNum)) !== -1) {
                        requestedFloors.splice(index, 1);    
                    }
                    
                    if (elevator.destinationQueue.length === 0) {
                        elevator.trigger('idle');
                    }
                    
                    removeFloorFromRequests(floorNum, direction);
                }

                this.getCurrentFloor = getCurrentFloor;
                this.getDirection = getDirection;
                this.hasDestinationOrWillPass = hasDestinationOrWillPass;

                elevator.on('idle', onIdle);
                elevator.on('floor_button_pressed', onFloorButtonPressed);
                elevator.on('passing_floor', onPassingFloor);
                elevator.on('stopped_at_floor ', onStoppedAtFloor);
            };

            return {
                registerElevator: registerElevator,
                registerFloor: registerFloor,
                getRequests: getRequests,
                getElevators: getElevators
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
