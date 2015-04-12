{
    init: function(elevators, floors) {
        var FloorsController = (function(){
            var topFloor = null;
            
            var setTopFloor = function (floorNum) {
                this.topFloor = floorNum;  
            };
            
            var getTopFloor = function () {
                return topFloor;
            }

            return {
                setTopFloor: setTopFloor,
                getTopFloor: getTopFloor
            }
        })();
        
        var Direction = {
            UP: "up",
            DOWN: "down"
        };

        var ElevatorController = (function() {
            var elevators = [];
            
            var requests = {
                up: [],
                down: []
            };
            
            var Elevator = function (elevator) {
                var direction = null;
                
                var waitForMoreLevels = null;
                
                var localQueue = [];
                
                elevator.on('idle', function() {
                    setIndicators();
                });
                
                elevator.on("passing_floor", function (floorNum, direction) {
                    if ((index = requests[direction].indexOf(floorNum)) !== -1
                        && elevator.loadFactor() < 1) {
                        requests[direction].splice(index, 1);
                        elevator.goToFloor(floorNum, true);
                        elevator.checkDestinationQueue();
                        return;
                    }
                    
                    if (elevator.getPressedFloors().indexOf(floorNum) !== -1) {
                        elevator.goToFloor(floorNum, true);
                        elevator.checkDestinationQueue();
                        return;
                    }
                });
                
                elevator.on('stopped_at_floor', function () {
                    // If there are no destinations left, check queue
                    if (elevator.destinationQueue.length === 0) {
                        nextFloor();
                    }
                });
                
                elevator.on('floor_button_pressed', function (floorNum) {
                    //clearTimeout(timeout);
                    //timeout = setTimeout(function() {
                        var pressedFloors = elevator.getPressedFloors();
                        
                        pressedFloors.sort(function(a, b) {
                            return (a==b ? 0 : a < b ? -1 : 1) * (direction === Direction.DOWN ? 1 : -1)
                        }).forEach(function (floor) {
                            // Handle request in the direction
                            if (direction === Direction.UP && floor > elevator.currentFloor()) {
                                goToFloor(floor);
                                return;
                            }
                            
                            if (direction === Direction.DOWN && floor < elevator.currentFloor()) {
                                goToFloor(floor);
                                return;
                            }
                            
                            localQueue.push(floor);
                        });
                        
                        if (localQueue.length > 0) {
                            goToFloor(localQueue.shift());
                        }
                    //}, 1000);
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
                    elevator.goToFloor(floorNum);
                }
               
                var nextFloor = function () {
                    var nextFloor = null;

                    if (nextFloor === null && localQueue.length > 0) {
                        //nextFloor = localQueue.shift();
                        //setDirection(nextFloor > elevator.currentFloor() ? Direction.UP : Direction.DOWN);
                        //goToFloor(nextFloor);
                        //return;
                    }
                    
                    if ((direction === Direction.UP || direction === null) && requests.up.length > 0) {
                        nextFloor = requests.up.shift();
                        setDirection(Direction.UP);
                    }
                    
                    if ((direction === Direction.DOWN || direction === null) && requests.down.length > 0) {
                        nextFloor = requests.down.shift();
                        setDirection(Direction.DOWN);
                    }
                    
                    if (nextFloor !== null) {
                        goToFloor(nextFloor);
                        return;
                    }
                    
                    // Set free because there is no destination
                    setDirection(null);
                };
                
                this.nextFloor = nextFloor;
                
                this.getDirection = function () {
                    return direction;
                };
            };
            
            var addElevator = function (elevator) {
                elevators.push(elevator);  
            };
            
            var requestElevator = function (floorNum, direction) {
                if (requests[direction].indexOf(floorNum) === -1) {
                    requests[direction].push(floorNum);
                }
                for (elevator in elevators) {
                    if (elevators[elevator].getDirection() === null) {
                        elevators[elevator].nextFloor();
                        return;
                    }
                }
            };
            
            return {
                Elevator: Elevator,
                addElevator: addElevator,
                requestElevator: requestElevator
            };
        })();

        elevators.forEach(function (elevator) {
            ElevatorController.addElevator(new ElevatorController.Elevator(elevator));
        });

        floors.forEach(function (floor) {
            floor.on("up_button_pressed", function () {
                ElevatorController.requestElevator(floor.floorNum(), Direction.UP);
            });
            floor.on("down_button_pressed", function () {
                ElevatorController.requestElevator(floor.floorNum(), Direction.DOWN);
            });
        });
        
        FloorsController.setTopFloor(floors[floors.length - 1].floorNum());
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
