'use strict'

import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import MapView, { Polyline, Marker, Circle } from 'react-native-maps';
import { StyleSheet, View, TouchableOpacity, Text, ToastAndroid, Alert } from 'react-native';
import * as Location from 'expo-location';
import moment from 'moment';
import axios from '../axios';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TRACKING = 'background-location-task';

const Map = ({ navigation }) => {
    const TrackingDirectory = FileSystem.documentDirectory + '/tracking_history';
    const MobileDirectory = FileSystem.documentDirectory + '/tracking_mobile';
    const HistoryFile = TrackingDirectory + '/history.txt';
    const MobileFile = MobileDirectory + '/mobile.txt';
    
    const [session, setSession] = useState();
    const [distance, setDistance] = useState(null);
    const [reachedAtAStation, setReachedAtAStation] = useState(null);
    const [nextStation, setNextStation] = useState();
    const [userInfo, setUserInfo] = useState();
    const [stops, setStops] = useState([]);
    const [location, setLocation] = useState(null);
    const [started, setStarted] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [coordinates, setCoordinates] = useState([]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const backgroundLocation = await Location.requestBackgroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }else if (backgroundLocation.status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            setSession(uuidv4());
            getMobile();
            create();
        })();
    }, []);
    useEffect(() => {
        if (started) {
            watchLocation();
        }
    }, [started]);
    useEffect(() => {
        if (coordinates.length > 0 && started) {
            saveInFile();
            let arr = stops.slice();
            arr.map((val) => {
                const { coords } = coordinates.slice(-1)[0];
                const distance = calcCrow(parseFloat(coords.latitude), parseFloat(coords.longitude), parseFloat(val.latitude), parseFloat(val.longitude));
                val.distance = distance;
                return val;
            });
            const min = Math.min(...arr.map(item => item.distance));
            const theNextStation = arr.find(obj => {return obj.distance === min});
            if (!nextStation && theNextStation) {
                Speech.speak(`The Next station is. ${theNextStation.stop_name}`, { rate: 0.9, pitch: 0.7 });
                setStops(arr);
            }else if (nextStation && theNextStation && nextStation.stop_name !== theNextStation.stop_name) {
                Speech.speak(`The Next station is. ${theNextStation.stop_name}`, { rate: 0.9, pitch: 0.7 });
            }
            if (theNextStation) {
                setNextStation(theNextStation);
                setDistance(parseFloat(theNextStation.distance));
            }
        }
    }, [coordinates]);
    useEffect(() => {
        if (distance && started) {
            // 0.0499 original distance
            if (distance < 0.0499 && reachedAtAStation === null && nextStation) {
                setReachedAtAStation(nextStation.stop_id);
            }else if (distance > 0.0499 && reachedAtAStation !== null && nextStation) {
                moveFromAStation();
            }
        }
    }, [distance]);
    useEffect(() => {
        if (reachedAtAStation && nextStation) {
            stationReached(nextStation);
        }
    }, [reachedAtAStation]);

    const moveFromAStation = () => {
        const currentDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
        FileSystem.readAsStringAsync(HistoryFile, { encoding: FileSystem.EncodingType.UTF8 }).then(data => {
            const data_found = JSON.parse(data);
            if(data_found.length > 0) {
                data_found.map((obj) => {
                    if (obj && obj.date === currentDate && obj.endTime === '') {
                        obj.stopsReached.map(
                            station => {
                                if (parseInt(station.stop_id) === parseInt(reachedAtAStation)) {
                                    station.moveTime = new Date().toTimeString();
                                }
                                return station;
                            }
                        )
                    };
                    return obj;
                });
                const stations = stops.slice().filter(obj => {return parseInt(obj.stop_id) !== parseInt(reachedAtAStation)});
                if (stations.length > 0) {
                    setStops(() => stations);
                }else {
                    setStops(() => []);
                    setNextStation(null);
                }
                setReachedAtAStation(null);
                update(data_found);
            }
        }).catch((err) => {
            console.log("Err Found1:", err);
            create();
        });
    }
    const stationReached = (station) => {
        Speech.speak(station.stop_name, { rate: 0.9, pitch: 0.7 });
        const currentDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
        FileSystem.readAsStringAsync(HistoryFile, { encoding: FileSystem.EncodingType.UTF8 }).then(data => {
            const data_found = JSON.parse(data);
            if (data_found.length > 0) {
                data_found.map((obj) => {
                    if (obj && obj.date === currentDate && obj.endTime === '') {
                        if (obj.stopsReached) {
                            obj.stopsReached.push(
                                {
                                    stop_id: station.stop_id,
                                    stop_name: station.stop_name,
                                    timeReached: new Date().toTimeString()
                                }
                            );
                        }else {
                            obj.stopsReached = [
                                {
                                    stop_id: station.stop_id,
                                    stop_name: station.stop_name,
                                    timeReached: new Date().toTimeString()
                                }
                            ];
                        }
                    };
                    return obj;
                });
            }
            update(data_found);
        }).catch((err) => {
            console.log("Err Found2:", err.stack);
            create();
        });
    }
    const checkIfThePreviousTrackingWasEnded = (id) => {
        const currentDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
        FileSystem.readAsStringAsync(HistoryFile, { encoding: FileSystem.EncodingType.UTF8 }).then(data => {
            const data_found = JSON.parse(data);
            if(data_found.length > 0) {
                let objData;
                data_found.map((obj) => {
                    if (obj && obj.date === currentDate && obj.endTime === '') {
                        objData = obj;
                    };
                    return obj;
                });
                if (objData) {
                    Alert.alert(
                        'Previous Tracking Found',
                        'Your previous tracking is saved and not updated on live. Do you want to update it on live?',
                        [
                            {
                                text: "Yes, Update",
                                onPress: () => updateOnLive(objData, id)
                            },
                            {
                                text: "No, Delete",
                                onPress: () => removeFile()
                            },
                        ]
                    );
                }
            }
        }).catch((err) => {
            console.log("Err Found3:", err);
            create();
        });
    }
    const fetchRoute = (id) => {
        ToastAndroid.show('Fetching Your Route', ToastAndroid.SHORT);
        axios.post('/vehicle/tracking/route', {mobile_id: id}).then(({data}) => {
            setStops(data[0]);
            if (!userInfo) setUserInfo({mobile_id: id, route_id: data[1].route_id});
            checkIfThePreviousTrackingWasEnded(id);
        }).catch(err => {
            console.log(err);
            Alert.alert("Err2", "Application error found:" + err, [ {text: "Retry", onPress: () => fetchRoute(id)}, {text: 'Close'} ])
        });
    }
    const getMobile = async () => {
        ToastAndroid.show('Getting Your ID', ToastAndroid.SHORT);
        FileSystem.readAsStringAsync(MobileFile, { encoding: FileSystem.EncodingType.UTF8 }).then(
            data => {
                const id = data;
                fetchRoute(id);
            }
        ).catch(err => {
            console.log(err);
            Alert.alert("Err1", "Application error found:" + err, [ {text: "Retry", onPress: () => getMobile()}, {text: 'Close'} ])
        });
    }
    const watchLocation = async () => {
        await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {accuracy: Location.Accuracy.Balanced, timeInterval: 1000, distanceInterval: 1});
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING);
    }
    const getDuration = () => {
        const startingTime = moment(startTime, 'HH:mm:ss a');
        const endingTime = endTime.length > 0 ? moment(endTime, 'HH:mm:ss a') : moment(new Date().toTimeString(), 'HH:mm:ss a');
        const duration = moment.duration(endingTime.diff(startingTime));
        const hours = parseInt(duration.asHours());
        const minutes = parseInt(duration.asMinutes()) % 60;
        return `${hours}:${minutes}`;
    }
    const saveInFile = async () => {
        const currentDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
        FileSystem.readAsStringAsync(HistoryFile, { encoding: FileSystem.EncodingType.UTF8 }).then(data => {
            const data_found = JSON.parse(data);
            if(data_found.length > 0) {
                data_found.map((obj) => {
                    if (obj && obj.date === currentDate && obj.endTime === '') {
                        obj.coordinates = coordinates
                    };
                    return obj;
                });
            }else {
                data_found.push(
                    {
                        userInfo: userInfo,
                        startTime: startTime,
                        endTime: endTime,
                        date: currentDate,
                        coordinates: coordinates
                    }
                );
            }
            update(data_found);
        }).catch((err) => {
            console.log("Err Found4:", err);
            create();
        });
    }
    const update = async (data_found) => {
        console.log('updated', new Date().toLocaleTimeString());
        await FileSystem.writeAsStringAsync(HistoryFile, JSON.stringify(data_found), { encoding: FileSystem.EncodingType.UTF8 });
    }
    const create = async () => {
        const fileExists = await FileSystem.getInfoAsync(HistoryFile);
        if (!fileExists.exists) {
            await FileSystem.makeDirectoryAsync(TrackingDirectory, { intermediates: true });
            FileSystem.writeAsStringAsync(HistoryFile, JSON.stringify([]), { encoding: FileSystem.EncodingType.UTF8 }).then(() => {
                    console.log("File has been created");
            }).catch(
                err => {
                    Alert.alert('error while creating file', err.message);
                }
            )
        }
    }
    const start = () => {
        setStarted(true);
        setStartTime(new Date().toTimeString());
        ToastAndroid.show('Tracking Started', ToastAndroid.SHORT);
    }
    const end = async () => {
        const currentDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
        const endingTime = new Date().toTimeString();
        ToastAndroid.show('Tracking Ended', ToastAndroid.SHORT);
        setEndTime(endingTime);
        FileSystem.readAsStringAsync(HistoryFile, { encoding: FileSystem.EncodingType.UTF8 }).then(data => {
            const data_found = JSON.parse(data);
            console.log(data)
            data_found.map((obj) => {
                if (obj && obj.date === currentDate && obj.endTime === '') {
                    obj.endTime = endingTime;
                    updateOnLive(obj);
                }else if (obj.endTime !== '') {
                    obj.endTime === ''
                }
                return obj;
            });
        }).catch((err) => {
            console.log("Err Found5:", err);
            create();
        });
    }
    const saveData = async (data_found) => {
        await FileSystem.writeAsStringAsync(HistoryFile, JSON.stringify(data_found), { encoding: FileSystem.EncodingType.UTF8 });
        ToastAndroid.show('Saved', ToastAndroid.SHORT);
        // navigation.navigate('History');
    }
    const updateOnLive = (obj, id) => {
        setStarted(false);
        ToastAndroid.show('Updating on live', ToastAndroid.SHORT);
        axios.post('/vehicle/tracking/save', {data: JSON.stringify(obj)}).then(() => {
            setStartTime('');
            setEndTime('');
            setCoordinates([]);
            getLocation(id);
            axios.post('/vehicle/tracking/route', {mobile_id: userInfo ? userInfo.mobile_id : id}).then(({data}) => {
                TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING).then((tracking) => {
                    if (tracking) {
                        Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
                    }
                })
                setStops(data[0]);
                removeFile()
                Alert.alert("Data Updated", "Your route track logs has been updated on live.", [{text: "Okay"}]);
            }).catch(err => console.log(err));
        }).catch(err => {
            setStarted(true);
            console.log(err);
            Alert.alert("Err1", "Application error found:" + err, [ {text: "Retry", onPress: () => updateOnLive(obj)}, {text: 'Close'} ])
        });
    }
    const getLocation = async (id) => {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        fetchRoute(userInfo ? userInfo.mobile_id : id);
    }
    const removeFile = async () => {
        await FileSystem.deleteAsync(HistoryFile);
        create();
        console.log("File deleted successfully");
    }
    const continuePreviousTracking = (data) => {
        const { startTime, coordinates } = data;
        setStarted(true);
        setStartTime(startTime);
        setCoordinates(coordinates);
    }
    function toRad(Value) {
        return Value * Math.PI / 180;
    }
    function calcCrow(lat1, lon1, lat2, lon2) {
        var R = 6371; // km
        var dLat = toRad(lat2 - lat1);
        var dLon = toRad(lon2 - lon1);
        var lat1 = toRad(lat1);
        var lat2 = toRad(lat2);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }
    function convertInKm(coords) {
        return ((coords * 3600) / 1000).toFixed(2);
    }
    TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
        if (error) {
            console.log('LOCATION_TRACKING task ERROR:', error);
            return;
        }
        if (data) {
            const { locations } = data;
            if (locations[0]) {
                locations[0].session_id = session;
                setCoordinates((coords) => [...coords, locations[0]]);
                setLocation(locations[0]);
            }
        }
    });
    if(!userInfo) {
        return <Text style={{textAlign: 'center', paddingTop: 50}}>Getting Your ID....</Text>;
    }
    return (
        <View style={styles.container}>
            {
                location && userInfo && userInfo.mobile_id && userInfo.route_id
                ?
                <View style={{flex: 1}}>
                    <View style={{height: 50, backgroundColor: '#1b293b',alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={{color: "#fff", fontSize: 18, textAlign: 'center'}}>Live Vehicle Tracking</Text>
                    </View>
                    <MapView style={styles.map}
                        // minZoomLevel={15}
                        paddingAdjustmentBehavior="automatic"
                        initialRegion={
                            {
                                latitude: location.coords?.latitude,
                                longitude: location.coords?.longitude,
                                latitudeDelta: 0.0922,
                                longitudeDelta: 0.0421,
                            }
                        }
                        mapType='hybrid'
                        userInterfaceStyle="dark"
                        userLocationPriority="high"
                        followsUserLocation
                        showsUserLocation
                        loadingEnabled
                        fitToElements
                        // showsTraffic
                    >
                        <Polyline
                            coordinates={coordinates.map(({coords}) => {return coords})}
                            strokeColor='#3296ff'
                            strokeWidth={3}
                        />
                        {
                            nextStation
                            ?
                            <View>
                                <Marker
                                    coordinate={{ latitude: nextStation.latitude, longitude: nextStation.longitude }}
                                    title={nextStation.stop_name}
                                    description='Next Station'
                                />
                                <Circle
                                    center={{ latitude: nextStation.latitude, longitude: nextStation.longitude }}
                                    strokeColor={'#E99A28'}
                                    strokeWidth={2}
                                    fillColor={'rgba(37, 55, 84, 0.2)'}
                                    radius={50}
                                />
                            </View>
                            :null
                        }
                        {
                            stops.map(
                                ({ stop_name, latitude, longitude }, i) => {
                                    return (
                                        <View key={i}>
                                            <Marker
                                                coordinate={{ latitude: latitude, longitude: longitude }}
                                                title={stop_name}
                                                description='Station'
                                            />
                                            <Circle
                                                center={{ latitude: latitude, longitude: longitude }}
                                                strokeColor={'#E99A28'}
                                                strokeWidth={2}
                                                fillColor={'rgba(37, 55, 84, 0.2)'}
                                                radius={50}
                                            />
                                        </View>
                                    )
                                }
                            )
                        }
                    </MapView>
                    <View style={styles.controls}>
                        {
                            started
                            ?
                            <View>
                                <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                    <Text>Speed km/h</Text>
                                    <Text>{convertInKm(coordinates.slice(-1)[0]?.coords?.speed)}</Text>
                                </View>
                                <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                    <Text>Hour(s)</Text>
                                    <Text>{startTime ? getDuration() : "..."}</Text>
                                </View>
                                {
                                    endTime.length > 0
                                    ?
                                    <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                        <Text>End Time</Text>
                                        <Text>{endTime !== '' ? moment(endTime, 'HH:mm:ss a').format('HH:mm A') : null}</Text>
                                    </View>
                                    :null
                                }
                                <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                    <Text>Start Time</Text>
                                    <Text>{startTime !== '' ? moment(startTime, 'HH:mm:ss a').format('HH:mm A') : null}</Text>
                                </View>
                                <TouchableOpacity style={[ styles.btn, { backgroundColor: '#114fa5', marginTop: 10 } ]} onPress={end}>
                                    <Text style={styles.btnText}>End</Text>
                                </TouchableOpacity>
                            </View>
                            :
                            <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-around'}}>
                                <TouchableOpacity style={[styles.btn, {width: '45%'}]} onPress={start}>
                                    <Text style={styles.btnText}>Start</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigation.navigate('History')} style={[styles.btn, {width: '45%', backgroundColor: '#114fa5'}]}>
                                    <Text style={styles.btnText}>History</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    </View>
                </View>
                :
                <Text style={{textAlign: 'center', paddingTop: 30}}>Finding your coordinates...</Text>
            }
        </View>
    )
}

export default Map;

const styles = StyleSheet.create({
    container: {
        paddingTop: 30,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    },
    controls: {
        padding: 10
    },
    btn: {
        padding: 15,
        backgroundColor: "#1b293b",
        borderRadius: 5,
    },
    btnText: {
        textAlign: "center",
        color: "#fff"
    },
    map: {
        flex: 1,
        minHeight: '50%'
    },
});