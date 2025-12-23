import { spawn } from 'child_process';
import path from 'path';

export interface DockerResult {
    success: boolean;
    message?: string;
    process?: any;
}

export const checkDocker = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        const child = spawn('docker', ['info'], { stdio: 'ignore' });
        child.on('close', (code) => {
            resolve(code === 0);
        });
        child.on('error', () => {
            resolve(false);
        });
    });
};

export const deployLab = (labPath: string, env: Record<string, string>, onLog: (data: string) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'up', '-d'], {
            cwd: labPath,
            env: { ...process.env, ...env },
            shell: true
        });

        child.stdout.on('data', (data) => onLog(data.toString()));
        child.stderr.on('data', (data) => onLog(data.toString()));

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker exited with code ${code}`));
        });
    });
};

export const stopLab = (labPath: string, onLog: (data: string) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'down'], {
            cwd: labPath,
            shell: true
        });

        child.stdout.on('data', (data) => onLog(data.toString()));
        child.stderr.on('data', (data) => onLog(data.toString()));

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker exited with code ${code}`));
        });
    });
};
