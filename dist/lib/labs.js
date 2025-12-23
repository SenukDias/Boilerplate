import path from 'path';
import https from 'https';
import fs from 'fs';
const MANIFEST_URL = 'https://raw.githubusercontent.com/SenukDias/Boilerplate/main/labs/manifest.json';
const LOCAL_MANIFEST_PATH = path.join(process.cwd(), 'labs', 'manifest.json');
const USER_HOME_LABS = path.join(os.homedir(), 'Documents', 'Boilerplate');
import os from 'os';
export const getLabs = async () => {
    // 1. Try Local Manifest (Priority for development/local usage)
    if (fs.existsSync(LOCAL_MANIFEST_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(LOCAL_MANIFEST_PATH, 'utf-8'));
            return localData.map(transformToLab);
        }
        catch (e) {
            console.error("Failed to parse local manifest:", e);
        }
    }
    // 2. Fallback to Remote Manifest
    try {
        const remoteLabs = await fetchRemoteManifest();
        return remoteLabs.map(transformToLab);
    }
    catch (e) {
        // console.error("Failed to fetch remote manifest");
    }
    return [];
};
const fetchRemoteManifest = () => {
    return new Promise((resolve, reject) => {
        https.get(MANIFEST_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};
const transformToLab = (item) => {
    return {
        ...item,
        path: path.join(USER_HOME_LABS, item.category, item.id)
    };
};
