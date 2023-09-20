import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import axios from '../axios';
import { errFound } from '../requestError';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const Auth = ({ navigation }) => {
    const TrackingDirectory = FileSystem.documentDirectory + '/tracking_history';
    const Directory = FileSystem.documentDirectory + '/tracking_mobile';
    const File = Directory + '/mobile.txt';
    const HistoryFile = TrackingDirectory + '/history.txt';
    const [ info, setInfo ] = useState();
    const [ code, setCode ] = useState("");
    const [ btn, setBtn ] = useState(
        {
            text: "Next",
            disabled: false
        }
    );
    useEffect(
        () => {
            getMobile();
        }, []
    );
    const getMobile = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access files was denied');
            return;
        }

        const file = await FileSystem.getInfoAsync(File);
        if (file.exists) {
            FileSystem.readAsStringAsync(File, { encoding: FileSystem.EncodingType.UTF8 }).then(
                data => {
                    setInfo(data);
                }
            ).catch((err) => Alert.alert("Something went wrong", `Error found while running the application. ${err}`));
        }
    }
    const logMobile = async () => {
        setBtn(
            {
                text: "Please Wait...",
                disabled: true
            }
        );
        axios.post('/vehicle/tracking/mobile', {code: code}).then(({ data }) => {
            if (data.length > 0) {
                save(data);
                setBtn(
                    {
                        text: "Next",
                        disabled: false
                    }
                );
            }else {
                Alert.alert('Invalid Code', 'The code you have entered is not valid.');
                setBtn(
                    {
                        text: "Next",
                        disabled: false
                    }
                );
                setCode("");
            }
        }).catch(err => {
            setBtn(
                {
                    text: "Next",
                    disabled: false
                }
            );
            errFound(navigation, err, getMobilesList)
        });
        async function save(data) {
            const folder = await FileSystem.getInfoAsync(Directory);
            if (!folder.exists) {
                await FileSystem.makeDirectoryAsync(Directory);
            }
            const { mobile_id } = data[0];
            await FileSystem.writeAsStringAsync(File, `${mobile_id}`, { encoding: FileSystem.EncodingType.UTF8 });

            axios.post('/vehicle/tracking/mobile/login', {mobile_id: mobile_id}).then(() => {
                createTrackingFile();
                Alert.alert('Code Verified', 'Your mobile has been registered in our system.', [{text: "Okay", onPress: () => navigation.replace('Map')}]);
            }).catch(err => errFound(navigation, err, fetchRoute));
        }
    };
    const createTrackingFile = async () => {
        const fileExists = await FileSystem.getInfoAsync(HistoryFile);
        if (!fileExists.exists) {
            await FileSystem.writeAsStringAsync(HistoryFile, JSON.stringify([]), { encoding: FileSystem.EncodingType.UTF8 });
            console.log("File has been created");
        }
    }
    return (
        <View style={styles.container}>
            <View style={{height: 50, backgroundColor: '#1b293b',alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{color: "#fff", fontSize: 18, textAlign: 'center'}}>Mobile Registration</Text>
            </View>
            <View style={{padding: 10}}>
                <Text>Enter Registration Code</Text>
                <View style={{borderWidth: 1, borderColor: "lightgray"}}>
                    <TextInput
                        style={{ padding: 10 }}
                        onChangeText={(value) => setCode(value)}
                        value={code}
                        placeholder="Like 12345..."
                        keyboardType="numeric"
                    />
                </View>
                <View style={{borderRadius: 10, borderWidth: 1, borderColor: '#1b293b', backgroundColor: 'rgba(27, 41, 59, 0.5)', padding: 10, paddingHorizontal: 15, marginTop: 15 }}>
                    <Text style={{color: '#fff', fontSize: 11}}>Kindly contact the IT department and get your registration code.</Text>
                </View>
                {
                    code !== ""
                    ?
                    <TouchableOpacity style={[styles.btn, { marginLeft: 15 }]} onPress={logMobile} disabled={btn.disabled}>
                        <Text style={styles.btnText}>{btn.text}</Text>
                    </TouchableOpacity>
                    :info
                    ?
                    <TouchableOpacity style={[styles.btn, {alignSelf: 'center'}]} onPress={() => navigation.replace('Map')} disabled={btn.disabled}>
                        <Text style={styles.btnText}>Login</Text>
                    </TouchableOpacity>
                    :null
                }
            </View>
        </View>
    )
}

export default Auth;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 30,
    },
    btn: {
        padding: 10,
        paddingHorizontal: 20,
        alignSelf: 'flex-end',
        backgroundColor: '#1b293b',
        borderRadius: 10,
        marginTop: 15
    },
    btnText: {
        color: "#fff"
    }
});