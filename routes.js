var dbOperations = require('./db-operations');

function initialize(app, db, socket, io) {
    // 'Doctors?lat=12.9718915&&lng=77.64115449999997'
    app.get('/doctors', function(req, res) {
        /*
            extract the latitude and longitude info from the request. 
            Then, fetch the nearest Doctors using MongoDB's geospatial queries and return it back to the client.
        */
        var latitude = Number(req.query.lat);
        var longitude = Number(req.query.lng);
        dbOperations.fetchNearestDoctor(db, [longitude, latitude], function(results) {
            res.json({
                Doctors: results
            });
        });
    });

    // 'Doctors/info?userId=01'
    app.get('/doctors/info', function(req, res) {
        var userId = req.query.userId //extract userId from quert params
        dbOperations.fetchDoctorDetails(db, userId, function(results) {
            res.json({
                DoctorDetails: results
            });
        });
    });

    //Listen to a 'request-for-help' event from connected citizens
    socket.on('request-for-help', function(eventData) {
        /*
            eventData contains userId and location
            1. First save the request details inside a table requestsData
            2. AFTER saving, fetch nearby Doctors from citizen’s location
            3. Fire a request-for-help event to each of the cop’s room
        */

        var requestTime = new Date(); //Time of the request

        var ObjectID = require('mongodb').ObjectID;
        var requestId = new ObjectID; //Generate unique ID for the request

        //1. First save the request details inside a table requestsData.
        //Convert latitude and longitude to [longitude, latitude]
        var location = {
            coordinates: [
                eventData.location.longitude, 
                eventData.location.latitude
            ],
            address: eventData.location.address
        };
        dbOperations.saveRequest(db, requestId, requestTime, location, eventData.citizenId, 'waiting', function(results) {

            //2. AFTER saving, fetch nearby Doctors from citizen’s location
            dbOperations.fetchNearestDoctor(db, location.coordinates, function(results) {
                eventData.requestId = requestId;
                //3. After fetching nearest Doctors, fire a 'request-for-help' event to each of them
                for (var i = 0; i < results.length; i++) {
                    io.sockets.in(results[i].userId).emit('request-for-help', eventData);
                }
            });
        });
    });

    socket.on('request-accepted', function(eventData) { //Listen to a 'request-accepted' event from connected Doctors
        console.log(eventData);
        //Convert string to MongoDb's ObjectId data-type
        var ObjectID = require('mongodb').ObjectID;
        var requestId = new ObjectID(eventData.requestDetails.requestId);

        //Then update the request in the database with the cop details for given requestId
        dbOperations.updateRequest(db, requestId, eventData.DoctorDetails.copId, 'engaged', function(results) {
            //After updating the request, emit a 'request-accepted' event to the citizen and send cop details
            io.sockets.in(eventData.requestDetails.citizenId).emit('request-accepted', eventData.DoctorDetails);
        })

    });

    //Fetch all requests
    app.get('/requests/info', function(req, res) {
        dbOperations.fetchRequests(db, function(results) {
            var features = [];
            for (var i = 0; i < results.length; i++) {
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: results[i].location.coordinates
                    },
                    properties: {
                        status: results[i].status,
                        requestTime: results[i].requestTime,
                        address: results[i].location.address
                    }
                })
            }
            var geoJsonData = {
                type: 'FeatureCollection',
                features: features
            }

            res.json(geoJsonData);
        });
    });

}

exports.initialize = initialize;