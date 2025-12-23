import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
export const getRequiredEnvVars = (lab) => {
    const composePath = path.join(lab.path, 'docker-compose.yml');
    const exampleEnvPath = path.join(lab.path, '.env.example');
    const vars = new Map();
    // 1. Try to read .env.example
    if (fs.existsSync(exampleEnvPath)) {
        const content = fs.readFileSync(exampleEnvPath, 'utf-8');
        const parsed = dotenv.parse(content);
        for (const key of Object.keys(parsed)) {
            vars.set(key, {
                key,
                defaultValue: parsed[key],
                required: true // Assume required if in example
            });
        }
    }
    // 2. Scan docker-compose.yml for ${VAR} syntax
    if (fs.existsSync(composePath)) {
        const content = fs.readFileSync(composePath, 'utf-8');
        // Capture group 1: Key, Capture group 2: Default Value (optional)
        const regex = /\$\{?([A-Z0-9_]+)(?::-(.*?))?\}?/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            const defaultValue = match[2];
            if (!vars.has(key)) {
                // Ignore standard docker keys if needed, but for now capture all ALL_CAPS
                if (key.length > 2) {
                    vars.set(key, {
                        key,
                        defaultValue: defaultValue, // Set the magic value
                        required: true
                    });
                }
            }
            else if (defaultValue && !vars.get(key).defaultValue) {
                // If found in example without default, but found in compose WITH default, update it
                const existing = vars.get(key);
                existing.defaultValue = defaultValue;
                vars.set(key, existing);
            }
        }
    }
    return Array.from(vars.values());
};
export const saveEnvFile = (lab, env) => {
    const envPath = path.join(lab.path, '.env');
    const content = Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    fs.writeFileSync(envPath, content);
};
export const loadExistingEnv = (lab) => {
    const envPath = path.join(lab.path, '.env');
    if (fs.existsSync(envPath)) {
        return dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
    }
    return {};
};
