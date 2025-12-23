import fs from 'fs';
import path from 'path';

export interface Lab {
    id: string;
    name: string;
    category: string;
    description: string;
    path: string; // Absolute path to the lab directory
}

const LABS_DIR = path.join(process.cwd(), 'labs');

// Recursively scans the labs directory for categories and projects
export const getLabs = (): Lab[] => {
    if (!fs.existsSync(LABS_DIR)) return [];

    const labs: Lab[] = [];
    try {
        const categories = fs.readdirSync(LABS_DIR).filter(file =>
            fs.statSync(path.join(LABS_DIR, file)).isDirectory()
        );

        for (const category of categories) {
            const categoryPath = path.join(LABS_DIR, category);
            const labDirs = fs.readdirSync(categoryPath).filter(file =>
                fs.statSync(path.join(categoryPath, file)).isDirectory()
            );

            for (const labDir of labDirs) {
                const fullPath = path.join(categoryPath, labDir);
                // Check for docker-compose.yml to confirm it's a lab
                if (fs.existsSync(path.join(fullPath, 'docker-compose.yml'))) {
                    labs.push({
                        id: labDir,
                        name: labDir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
                        category: category,
                        description: `Deploy ${labDir} via Docker Compose`,
                        path: fullPath
                    });
                }
            }
        }
    } catch (err) {
        // console.error("Error scanning labs:", err);
    }

    return labs;
};
