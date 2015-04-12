{
    init: function(elevators, floors) {
        var FloorsController = (function(){
            var topFloor = null;

            var requests = {
                up: [],
                down: []
            };
            
            var setTopFloor = function (floorNum) {
                topFloor = floorNum;  
            };
            
            var getTopFloor = function () {
                return topFloor;
            }
            
            var requestElevator = function (floorNum, direction) {
                if (requests[direction].indexOf(floorNum) === -1) {
                    requests[direction].push(floorNum);
                }
            };
            
            var shouldStop = function (floorNum, direction) {
                if (direction === null) {
                    return false;
                }
                
                if ((index = requests[direction].indexOf(floorNum)) !== -1) {
                    return true;
                }
                
                return false;
            };
            
            var setStopped = function (floorNum, direction) {
                if ((direction === null || direction === Direction.UP) && (index = requests.up.indexOf(floorNum)) !== -1) {
                    requests.up.splice(index, 1);
                }
                
                if ((direction === null || direction === Direction.DOWN) && (index = requests.down.indexOf(floorNum)) !== -1) {
                    requests.down.splice(index, 1);
                }
            }

            return {
                setTopFloor: setTopFloor,
                getTopFloor: getTopFloor,
                requestElevator: requestElevator,
                shouldStop: shouldStop,
                setStopped: setStopped
            }
        })();
        
        var Direction = {
            UP: "up",
            DOWN: "down"
        };

        var ElevatorController = (function() {
            var elevators = [];
            
            
            var Elevator = function (elevator) {
                var direction = null;
                
                var pressedFloors = [];
                
                elevator.on('idle', function() {
                    if (elevator.loadFactor() === 0) {
                        // Set it free
                        setDirection(null);
                        goToFloor(elevator.currentFloor());
                    }
                    
                    checkForNextFloor();
                });
                
                elevator.on("passing_floor", function (floorNum, direction) {
                    var shouldStop = false;
                    
                    if ((index = pressedFloors.indexOf(floorNum)) !== -1) {
                        shouldStop = true;
                    }
                    
                    if (FloorsController.shouldStop(floorNum, direction) === true
                       && elevator.loadFactor() < 0.6) {
                        shouldStop = true;
                    }
                    
                    if (shouldStop) {
                        elevator.goToFloor(floorNum, true);
                        elevator.checkDestinationQueue();
                    }
                });
                
                elevator.on('stopped_at_floor', function (floorNum) {
                    setIndicators();
                    FloorsController.setStopped(floorNum, direction);
                    checkForNextFloor();
                });
                
                elevator.on('floor_button_pressed', function (floorNum) {
                    if (pressedFloors.indexOf(floorNum) === -1) {
                        pressedFloors.push(floorNum);
                    }
                });
                
                var setIndicators = function () {
                    if (elevator.currentFloor() === 0) {
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);
                        return;
                    }
                    
                    if (elevator.currentFloor() === FloorsController.getTopFloor()) {
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                        return;
                    }
                    
                    if (direction === Direction.UP) {
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);
                        return;   
                    }

                    if (direction === Direction.DOWN) {
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                        return;   
                    }

                    if (direction === null) {
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(true);
                        return;   
                    }
                };
                
                var setDirection = function (newDirection) {
                    if (direction !== newDirection) {
                        direction = newDirection;
                        setIndicators();
                    }
                };
                
                var goToFloor = function (floorNum) {
                    elevator.goToFloor(floorNum, true);
                    elevator.checkDestinationQueue();
                }
               
                var checkForNextFloor = function () {
                    if (pressedFloors.length > 0) {
                        var floorNum = pressedFloors.shift();
                        setDirection(floorNum > elevator.currentFloor() ? Direction.UP : Direction.DOWN);
                        goToFloor(floorNum);
                        return;
                    }
                };
                
                this.getDirection = function () {
                    return direction;
                };
            };
            
            var addElevator = function (elevator) {
                elevators.push(elevator);  
            };
            
            return {
                Elevator: Elevator,
                addElevator: addElevator
            };
        })();

        elevators.forEach(function (elevator) {
            ElevatorController.addElevator(new ElevatorController.Elevator(elevator));
        });

        floors.forEach(function (floor) {
            floor.on("up_button_pressed", function () {
                FloorsController.requestElevator(floor.floorNum(), Direction.UP);
            });
            floor.on("down_button_pressed", function () {
                FloorsController.requestElevator(floor.floorNum(), Direction.DOWN);
            });
        });
        
        FloorsController.setTopFloor(floors[floors.length - 1].floorNum());
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
