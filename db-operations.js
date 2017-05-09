function fetchNearestDoctor(db, coordinates, callback) {

    db.collection("doctors").createIndex({
        "location": "2dsphere"
    }, function() {
        db.collection("doctors").find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates
                    },
                    $maxDistance: 9000
                }
            }
        }).toArray(function(err, results) {
            if (err) {
                console.log(err)
            } else {
                callback(results);
            }
        });
    });
}

function fetchDoctorDetails(db, userId, callback) {
    db.collection("doctors").findOne({
        userId: userId
    }, function(err, results) {
        if (err) {
            console.log(err)
        } else {
            callback({
                doctorId: results.userId,
                displayName: results.displayName,
                phone: results.phone,
                location: results.location
            });
        }
    });
}

function saveRequest(db, requestId, requestTime, location, patientId, status, callback) {
    db.collection("requestsData").insert({
        "_id": requestId,
        requestTime: requestTime,
        location: location,
        patientId: patientId,
        status: status
    }, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback(results);
        }
    });
}

function updateRequest(db, issueId, doctorId, status, callback) {
    db.collection("requestsData").update({
        "_id": issueId
    }, {
        $set: {
            status: status,
            doctorId: doctorId
        }
    }, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback("Issue updated")
        }
    });
}

function fetchRequests(db, callback) {
    var collection = db.collection("requestsData");
    //Using stream to process lots of records
    var stream = collection.find({}, {
        requestTime: 1,
        status: 1,
        location: 1,
        _id: 0
    }).stream();

    var requestsData = [];

    stream.on("data", function(request) {
        requestsData.push(request);
    });
    stream.on('end', function() {
        callback(requestsData);
    });
}

exports.fetchNearestDoctor = fetchNearestDoctor;
exports.fetchDoctorDetails = fetchDoctorDetails;
exports.saveRequest = saveRequest;
exports.updateRequest = updateRequest;
exports.fetchRequests = fetchRequests;