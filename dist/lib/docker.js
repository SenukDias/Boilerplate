import { spawn } from 'child_process';
export const checkDocker = async () => {
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
export const deployLab = (labPath, env, onLog) => {
    return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'up', '-d'], {
            cwd: labPath,
            env: { ...process.env, ...env },
            shell: true
        });
        child.stdout.on('data', (data) => onLog(data.toString()));
        child.stderr.on('data', (data) => onLog(data.toString()));
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Docker exited with code ${code}`));
        });
    });
};
export const stopLab = (labPath, onLog) => {
    return new Promise((resolve, reject) => {
        const child = spawn('docker', ['compose', 'down'], {
            cwd: labPath,
            shell: true
        });
        child.stdout.on('data', (data) => onLog(data.toString()));
        child.stderr.on('data', (data) => onLog(data.toString()));
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Docker exited with code ${code}`));
        });
    });
};
export const getLabStatus = (labPath) => {
    return new Promise((resolve, reject) => {
        // Use --format json to get structured data
        const child = spawn('docker', ['compose', 'ps', '--format', 'json'], {
            cwd: labPath,
            shell: true
        });
        let stdout = '';
        child.stdout.on('data', (data) => stdout += data.toString());
        child.on('close', (code) => {
            if (code === 0) {
                try {
                    // Docker compose ps json output is one JSON object per line or an array
                    // Recent versions return an array or newline separated objects.
                    // Let's handle both.
                    const containers = [];
                    const lines = stdout.trim().split('\n');
                    for (const line of lines) {
                        if (!line)
                            continue;
                        const data = JSON.parse(line);
                        // Map fields. Note: Keys depend on version (Project, Scrvice, Name, State, Ports, etc)
                        // This mapping is best effort for standard V2 output
                        containers.push({
                            name: data.Name || data.name,
                            state: data.State || data.state,
                            status: data.Status || data.status,
                            ports: data.Publishers ? data.Publishers.map((p) => `${p.PublishedPort}->${p.TargetPort}`).join(', ') : (data.Ports || '')
                        });
                    }
                    resolve(containers);
                }
                catch (e) {
                    // If JSON parse fails, might be just empty or different format
                    resolve([]);
                }
            }
            else
                resolve([]);
        });
    });
};
