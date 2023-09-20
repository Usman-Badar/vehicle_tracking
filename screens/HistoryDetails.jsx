import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import MapView, { Callout, Circle, Marker, Polyline } from 'react-native-maps';
import axios from '../axios';
import * as FileSystem from 'expo-file-system';
import moment from 'moment';

const HistoryDetails = ({ route, navigation }) => {
    const Directory = FileSystem.documentDirectory + '/tracking_mobile';
    const MobileFile = Directory + '/mobile.txt';
    const { session_id, route_name } = route.params;
    const [userInfo, setUserInfo] = useState();
    const [logs, setLogs] = useState([]);
    const [stops, setStops] = useState([]);
    useEffect(
        () => {
            getMobile();
        }, []
    );
    const getMobile = async () => {
        FileSystem.readAsStringAsync(MobileFile, { encoding: FileSystem.EncodingType.UTF8 }).then(
            data => {
                const id = data;
                setUserInfo({mobile_id: id});
                loadDetails(id);
            }
        ).catch(err => {
            console.log(err);
            Alert.alert("Err2", "Application error found", [ {text: "Retry", onPress: () => getMobile()}, {text: 'Close'} ])
        });
    }
    const loadDetails = (id) => {
        ToastAndroid.show('Fetching Details', ToastAndroid.SHORT);
        axios.post('/vehicle/tracking/history/details', {mobile_id: id, session_id: session_id}).then(({data}) => {
            data[0].map((obj) => {
                if (obj.speed < 1 || !obj.speed) {
                    obj.strokeColor = '#dc3545';
                }else if (obj.speed > 30) {
                    obj.strokeColor = '#28a744';
                }
                return obj
            })
            setLogs(data[0]);
            setStops(data[1]);
        }).catch(err => {
            console.log(err);
            Alert.alert("Err2", "Application error found: " + err, [ {text: "Retry", onPress: () => loadDetails(id)}, {text: 'Close'} ])
        });
    }
    return (
        <View style={styles.container}>
            <View style={{flex: 1}}>
                <View style={{height: 50, backgroundColor: '#3c99d4',alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{color: "#fff", fontSize: 10, textAlign: 'center'}}>{route_name?route_name:'Session'}</Text>
                    <Text style={{color: "#fff", fontSize: 12, textAlign: 'center'}}>{session_id}</Text>
                </View>
                {
                    logs.length > 0
                    ?
                    <MapView style={styles.map}
                        paddingAdjustmentBehavior="automatic"
                        initialRegion={
                            {
                                latitude: logs[0].latitude,
                                longitude: logs[0].longitude,
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
                            coordinates={logs.map((obj) => {return obj})}
                            strokeWidth={3}
                            strokeColor="#3296ff" // fallback for when `strokeColors` is not supported by the map-provider
                        />
                        {
                            stops.map(
                                ({ stop_name, latitude, longitude, time_reach, time_start_moving }, i) => {
                                    return (
                                        <View key={i}>
                                            <Marker
                                                coordinate={{ latitude: latitude, longitude: longitude }}
                                                title={stop_name}
                                            >
                                                <Callout
                                                    tooltip={true}
                                                    style={{ backgroundColor: "#ffffff", borderRadius: 5 }}
                                                >
                                                    <View style={{ padding: 10 }}>
                                                        <Text style={{ textAlign: 'center', fontSize: 10}}>{stop_name}</Text>
                                                        <Text style={{fontSize: 10}}>Reach Time: {moment(time_reach, 'HH:mm:ss a').format('hh:mm:ss A')}</Text>
                                                        <Text style={{fontSize: 10}}>Moving Time: {moment(time_start_moving, 'HH:mm:ss a').format('hh:mm:ss A')}</Text>
                                                    </View>
                                                </Callout>
                                            </Marker>
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
                    :
                    <Text style={{textAlign: 'center'}}>Loading Details...</Text>
                }
                <View style={styles.controls}>
                    {/* {
                        started
                        ?
                        <View>
                            <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                <Text style={{fontFamily: "Poppins"}}>Speed km/h</Text>
                                <Text style={{fontFamily: "Poppins"}}>{parseFloat(coordinates.slice(-1)[0].coords.speed / 1000).toFixed(2)}</Text>
                            </View>
                            <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                <Text style={{fontFamily: "Poppins"}}>Hour(s)</Text>
                                <Text style={{fontFamily: "Poppins"}}>{startTime ? getDuration() : "..."}</Text>
                            </View>
                            {
                                endTime.length > 0
                                ?
                                <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                    <Text style={{fontFamily: "Poppins"}}>End Time</Text>
                                    <Text style={{fontFamily: "Poppins"}}>{moment(endTime, 'HH:mm:ss a')}</Text>
                                </View>
                                :null
                            }
                            <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-between', borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 5}}>
                                <Text style={{fontFamily: "Poppins"}}>Start Time</Text>
                                <Text style={{fontFamily: "Poppins"}}>{moment(startTime, 'HH:mm:ss a').format('HH:mm A')}</Text>
                            </View>
                            <TouchableOpacity style={[ styles.btn, { backgroundColor: '#ee4a2f', marginTop: 10 } ]} onPress={end}>
                                <Text style={styles.btnText}>End</Text>
                            </TouchableOpacity>
                        </View>
                        :
                        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-around'}}>
                            <TouchableOpacity style={[styles.btn, {width: '45%'}]} onPress={start}>
                                <Text style={styles.btnText}>Start</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('History')} style={[styles.btn, {width: '45%', backgroundColor: '#ee4a2f'}]}>
                                <Text style={styles.btnText}>History</Text>
                            </TouchableOpacity>
                        </View>
                    } */}
                </View>
            </View>
        </View>
    )
}

export default HistoryDetails;

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
        backgroundColor: "#3c99d4",
        borderRadius: 5,
    },
    btnText: {
        textAlign: "center",
        color: "#fff", 
    },
    map: {
        flex: 1,
        minHeight: '50%'
    },
});