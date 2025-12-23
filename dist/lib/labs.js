import fs from 'fs';
import path from 'path';
const LABS_DIR = path.join(process.cwd(), 'labs');
// Helper to scan for labs. For now, we hardcode categorizations or infer them.
// In a real scenario, we might read a 'lab.json' metadata file from each dir.
export const getLabs = () => {
    if (!fs.existsSync(LABS_DIR))
        return [];
    const labs = [];
    // crAPI
    if (fs.existsSync(path.join(LABS_DIR, 'crAPI'))) {
        labs.push({
            id: 'crAPI',
            name: 'crAPI (Completely Ridiculous API)',
            category: 'API Security',
            description: 'A vulnerable API for learning OWASP Top 10.',
            path: path.join(LABS_DIR, 'crAPI')
        });
    }
    // vapi
    if (fs.existsSync(path.join(LABS_DIR, 'vapi'))) {
        labs.push({
            id: 'vapi',
            name: 'vAPI',
            category: 'API Security',
            description: 'Vulnerable API for security testing practice.',
            path: path.join(LABS_DIR, 'vapi')
        });
    }
    return labs;
};
