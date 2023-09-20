import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ToastAndroid, TouchableOpacity, Alert } from 'react-native';
import axios from '../axios';
import * as FileSystem from 'expo-file-system';
import { errFound } from '../requestError';

const History = ({ navigation }) => {
    const Directory = FileSystem.documentDirectory + '/tracking_mobile';
    const MobileFile = Directory + '/mobile.txt';
    const [userInfo, setUserInfo] = useState();
    const [history, setHistory] = useState([]);

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
                loadHistory(id);
            }
        ).catch((err) => console.log(err));
    }
    const loadHistory = (id) => {
        ToastAndroid.show('Fetching Your History Routes', ToastAndroid.SHORT);
        axios.post('/vehicle/tracking/history', {mobile_id: id}).then(({data}) => {
            setHistory(data);
        }).catch(err => {
            console.log(err);
            Alert.alert("Err2", "Application error found: " + err, [ {text: "Retry", onPress: () => loadHistory(id)}, {text: 'Close'} ])
        });
    }
    return (
        <View>
            <ScrollView style={{paddingVertical: 50, paddingHorizontal: 20}}>
                <View style={{paddingBottom: 50}}>
                    <Text style={{ fontSize: 20, marginBottom: 20 }}>History Routes</Text>
                    {
                        history.length === 0
                        ?
                        <Text style={{ textAlign: 'center' }}>No Record Found</Text>
                        :
                        history.reverse().map(({session_id, date, time, route_name}, i) => {
                            const d = new Date(date).toDateString();
                            // onPress={() => navigation.navigate('HistoryDetails', { session_id: session_id })}
                            return (
                                <TouchableOpacity key={i} onPress={() => navigation.navigate('HistoryDetails', { session_id: session_id, route_name: route_name })} style={{ borderWidth: 1, borderColor: 'lightgray', padding: 10, marginBottom: 10, borderRadius: 5 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>Session</Text>
                                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>{route_name}</Text>
                                    </View>
                                    <Text style={{ fontSize: 12 }}>{session_id}</Text>
                                    <Text style={{ fontSize: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: "bold" }}>Date: </Text>
                                        {d} at {time}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })
                    }
                </View>
            </ScrollView>
        </View>
    )
}

export default History;