import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';
import yaml from 'js-yaml';

const LABS_DIR = path.join(process.cwd(), 'labs');

nunjucks.configure({ autoescape: false });

// Helper to recursively finding files
const walkDir = (dir: string, callback: (filePath: string) => void) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    }
};

const renderTemplates = () => {
    walkDir(LABS_DIR, (filePath) => {
        if (filePath.endsWith('compose.yaml.j2')) {
            const dir = path.dirname(filePath);
            const templateFile = path.join(dir, 'template.yaml');
            const outputFile = path.join(dir, 'docker-compose.yml');

            console.log(`Processing ${path.basename(dir)}...`);

            let context: any = {};

            // 1. Read defaults from template.yaml if exists
            if (fs.existsSync(templateFile)) {
                try {
                    const templateContent = fs.readFileSync(templateFile, 'utf-8');
                    const parsed = yaml.load(templateContent) as any;

                    // Extract vars from the 'spec' section
                    // Structure usually: spec -> [section] -> vars -> [varname] -> default
                    if (parsed && parsed.spec) {
                        Object.values(parsed.spec).forEach((section: any) => {
                            if (section.vars) {
                                Object.entries(section.vars).forEach(([key, val]: [string, any]) => {
                                    // Use default value, or empty string/false if missing
                                    context[key] = val.default !== undefined ? val.default : '';
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Error parsing template.yaml for ${dir}:`, e);
                }
            }

            // 2. Add some global defaults if missing (based on what we saw in the j2 file)
            // e.g. restart_policy, network_mode
            if (context.restart_policy === undefined) context.restart_policy = 'unless-stopped';
            if (context.network_mode === undefined) context.network_mode = 'bridge';
            if (context.traefik_enabled === undefined) context.traefik_enabled = false;
            // Ensure volumes and ports structures don't break if referenced

            // 3. Render
            try {
                const template = fs.readFileSync(filePath, 'utf-8');
                let rendered = nunjucks.renderString(template, context);

                // Force 'latest' tag for all images
                // Matches "image: something:version" or "image: something" and appends/replaces with :latest
                rendered = rendered.replace(/image:\s*([^\s:]+)(?::[^\s]*)?/g, 'image: $1:latest');

                // 4. Validate output is valid YAML (optional but good sanity check)
                // const valid = yaml.load(rendered); 

                // 5. Write to docker-compose.yml
                fs.writeFileSync(outputFile, rendered);
                console.log(`  -> Generated docker-compose.yml`);

                // 6. Optional: Clean up j2 files? User might want to keep source?
                // Let's keep them for now.

            } catch (e) {
                console.error(`Error rendering ${filePath}:`, e);
            }
        }
    });
};

renderTemplates();
