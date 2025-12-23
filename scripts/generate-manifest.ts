import fs from 'fs';
import path from 'path';

const LABS_DIR = path.join(process.cwd(), 'labs');
const OUTPUT_FILE = path.join(LABS_DIR, 'manifest.json');

interface LabManifestItem {
    id: string;
    name: string;
    category: string;
    description: string;
    files: string[];
}

const generate = () => {
    if (!fs.existsSync(LABS_DIR)) {
        console.error("Labs directory not found");
        return;
    }

    const manifest: LabManifestItem[] = [];
    const categories = fs.readdirSync(LABS_DIR).filter(file =>
        fs.statSync(path.join(LABS_DIR, file)).isDirectory()
    );

    for (const category of categories) {
        const categoryPath = path.join(LABS_DIR, category);
        const labDirs = fs.readdirSync(categoryPath).filter(file =>
            fs.statSync(path.join(categoryPath, file)).isDirectory()
        );

        for (const labDir of labDirs) {
            const labPath = path.join(categoryPath, labDir);
            const files = fs.readdirSync(labPath).filter(f => !f.startsWith('.')); // Ignore likely hidden files except .env maybe? .env is locally generated usually.

            // We specifically want docker-compose.yml and .env.example if it exists
            const artifacts = [];
            if (fs.existsSync(path.join(labPath, 'docker-compose.yml'))) artifacts.push('docker-compose.yml');
            if (fs.existsSync(path.join(labPath, '.env.example'))) artifacts.push('.env.example');

            if (artifacts.includes('docker-compose.yml')) {
                manifest.push({
                    id: labDir,
                    name: labDir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    category: category,
                    description: `Deploy ${labDir} from Senuk's Boilerplate`,
                    files: artifacts
                });
            }
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated at ${OUTPUT_FILE} with ${manifest.length} labs.`);
};

generate();
