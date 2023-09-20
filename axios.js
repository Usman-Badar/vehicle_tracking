import axios from 'axios';
// https://202.63.220.170:3443/

const instance = axios.create(
    {
        baseURL: 'https://202.63.220.170:3443/',
        timeout: 4000
    }
);

export default instance;