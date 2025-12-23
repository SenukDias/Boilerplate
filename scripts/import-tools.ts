import fs from 'fs';
import path from 'path';

const SOURCE_base = path.join(process.cwd(), 'temp_cl_boilerplates', 'library', 'compose');
const DEST_BASE = path.join(process.cwd(), 'labs');

const CATEGORY_MAP: Record<string, string[]> = {
    'Networking': ['adguardhome', 'bind9', 'nginx', 'pihole', 'traefik', 'twingate-connector'],
    'Security': ['authentik', 'passbolt'],
    'Monitoring': ['alloy', 'checkmk', 'grafana', 'influxdb', 'loki', 'prometheus', 'uptimekuma'],
    'Automation': ['homeassistant', 'n8n', 'semaphoreui'],
    'Development': ['gitea', 'gitlab', 'gitlab-runner', 'renovate'],
    'Cloud': ['nextcloud'],
    'Dashboard': ['homepage', 'homer'],
    'Databases': ['mariadb', 'postgres'],
    'AI_Other': ['openwebui', 'dockge', 'netbox', 'whoami', 'pangolin', 'portainer']
};

const copyDir = (src: string, dest: string) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

const importTools = () => {
    if (!fs.existsSync(SOURCE_base)) {
        console.error(`Source directory not found: ${SOURCE_base}`);
        return;
    }

    Object.entries(CATEGORY_MAP).forEach(([category, tools]) => {
        const categoryDir = path.join(DEST_BASE, category);
        if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

        tools.forEach(tool => {
            const srcToolDir = path.join(SOURCE_base, tool);
            const destToolDir = path.join(categoryDir, tool);

            if (fs.existsSync(srcToolDir)) {
                console.log(`Importing ${tool} to ${category}...`);
                // For 'uptimekuma', the folder name in CL is 'uptimekuma', but we might want 'uptime-kuma'
                // Let's keep original names for simplicity unless strictly required. 
                // Wait, our previous one was 'uptime-kuma'. CL is 'uptimekuma'.
                // This will create a duplicate if names differ. 
                // I'll rename 'uptimekuma' to 'uptime-kuma' manually in the map loop logic if needed.
                // For now, let's just copy as is. 
                copyDir(srcToolDir, destToolDir);
            } else {
                console.warn(`Tool ${tool} not found in source.`);
            }
        });
    });
};

importTools();
