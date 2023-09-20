import { Alert } from 'react-native';
import axios from './axios';
import * as Network from 'expo-network';

export const errFound = async (navigation, err, retry, ...props) => {
    try {
        const { isConnected } = await Network.getNetworkStateAsync();
        if (isConnected) {
            axios.get('/testing').then(() => successShowErr(navigation, err, retry, ...props)).catch(() => showErr(navigation, err, retry, ...props));
        }
    }catch (err) {
        console.log(err);
    }
}

const showErr = (navigation, err, retry, ...props) => {
    console.log(`Something went wrong: ${err}`);
    // navigation.replace('Error');
    Alert.alert(
        'Request Failed',
        `Something went wrong: ${err}`,
        [
            {
                text: 'Close',
            },
        ]
    );
}

const successShowErr = (navigation, err, retry, ...props) => {
    console.log(`Something went wrong: ${err}`);
    // navigation.replace('Error');
    Alert.alert(
        'Request Failed',
        `Server status: ONLINE\nError log: ${err}`,
        [
            {
                text: 'Close',
            },
        ]
    )
}