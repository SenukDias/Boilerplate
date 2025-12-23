import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import fs from 'fs';
import { getLabs, Lab } from '../lib/labs.js';
import { getRequiredEnvVars, EnvVar, saveEnvFile, loadExistingEnv } from '../lib/env.js';
import { deployLab, stopLab, getLabStatus, ContainerStatus } from '../lib/docker.js';
import { setupLabLocally } from '../lib/downloader.js';
import EnvForm from './EnvForm.js';
import Header from './Header.js';

const App = () => {
    const { exit } = useApp();
    const [labs, setLabs] = useState<Lab[]>([]);
    const [view, setView] = useState<'list' | 'details' | 'downloading' | 'config' | 'deploying' | 'active'>('list');

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectIndex, setSelectIndex] = useState(0);

    // Deployment State
    const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [containerStatus, setContainerStatus] = useState<ContainerStatus[]>([]);
    const [downloadStatus, setDownloadStatus] = useState<string>('');

    useEffect(() => {
        getLabs().then(setLabs);
    }, []);

    // Derived list of filtered labs
    const filteredLabs = labs.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useInput((input: string, key: any) => {
        if (view === 'deploying' || view === 'downloading') return;

        if (key.escape) {
            if (view === 'list') {
                if (searchQuery) setSearchQuery(''); // Clear search first
                else exit();
            }
            else setView('list');
        }

        if (view === 'list') {
            if (key.upArrow) {
                setSelectIndex(prev => Math.max(0, prev - 1));
            }
            if (key.downArrow) {
                setSelectIndex(prev => Math.min(filteredLabs.length - 1, prev + 1));
            }
            if (key.return) {
                if (filteredLabs[selectIndex]) {
                    setSelectedLab(filteredLabs[selectIndex]);
                    setView('details');
                }
            }
        }

        if (view === 'details') {
            if (key.return) { // Install / Configure
                if (selectedLab) {
                    if (fs.existsSync(selectedLab.path)) {
                        // Already exists, go to config
                        prepareConfig(selectedLab);
                    } else {
                        // Need to download
                        startDownload(selectedLab);
                    }
                }
            }
            if (input === 's' && selectedLab && fs.existsSync(selectedLab.path)) {
                stopLab(selectedLab.path, (log) => setLogs(prev => [...prev.slice(-50), log]))
                    .then(() => setLogs(prev => [...prev, 'Stopped.']))
                    .catch(e => setLogs(prev => [...prev, e.message]));
            }
        }
    });

    const startDownload = async (lab: Lab) => {
        setView('downloading');
        setDownloadStatus(`Initializing download for ${lab.name}...`);
        try {
            setDownloadStatus(`Fetching files from remote repository...`);
            await setupLabLocally(lab.category, lab.id, lab.files);
            setDownloadStatus('Download complete!');

            // Short delay to show success
            setTimeout(() => {
                prepareConfig(lab);
            }, 1000);

        } catch (e: any) {
            setDeployError(`Download failed: ${e.message}`);
            setView('details');
        }
    };

    const prepareConfig = (lab: Lab) => {
        const vars = getRequiredEnvVars(lab);
        const existing = loadExistingEnv(lab);
        vars.forEach(v => {
            if (existing[v.key]) v.value = existing[v.key];
        });

        if (vars.length > 0) {
            setEnvVars(vars);
            setView('config');
        } else {
            startDeploy({});
        }
    };

    const startDeploy = async (values: Record<string, string>) => {
        if (!selectedLab) return;
        saveEnvFile(selectedLab, values);
        setView('deploying');
        setLogs(['Starting deployment...']);
        setContainerStatus([]);
        setDeployError(null);

        try {
            await deployLab(selectedLab.path, values, (log) => {
                setLogs(prev => [...prev.slice(-50), log.trim()]);
            });

            const status = await getLabStatus(selectedLab.path);
            setContainerStatus(status);

            setView('active');
        } catch (e: any) {
            setDeployError(e.message);
            setView('details'); // Go back to details to show error
        }
    };

    if (labs.length === 0) {
        return <Text>Loading Labs Catalog...</Text>;
    }

    // Render Logic
    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
            <Header />

            {view === 'list' && (
                <Box flexDirection="column">
                    <Box borderStyle="single" borderColor="green" marginBottom={1} paddingX={1}>
                        <Text color="green">Search: </Text>
                        <TextInput
                            value={searchQuery}
                            onChange={(val) => {
                                setSearchQuery(val);
                                setSelectIndex(0);
                            }}
                            placeholder="Type to filter..."
                        />
                    </Box>

                    <Text underline>Remote Catalog:</Text>
                    {filteredLabs.slice(0, 15).map((lab, index) => ( // limit display
                        <Box key={lab.id} justifyContent="space-between">
                            <Text color={index === selectIndex ? "cyan" : "white"}>
                                {index === selectIndex ? "> " : "  "}
                                {lab.name}
                            </Text>
                            <Text color="gray">[{lab.category}]</Text>
                        </Box>
                    ))}

                    <Box marginTop={1}>
                        <Text dimColor>Arrows to move, Enter to install/select</Text>
                    </Box>
                </Box>
            )}

            {view === 'details' && selectedLab && (
                <Box flexDirection="column">
                    <Text bold color="orange">{selectedLab.name}</Text>
                    <Box borderStyle="single" borderColor="orange" padding={1}>
                        <Text>{selectedLab.description}</Text>
                        <Text dimColor>Target Path: {selectedLab.path}</Text>
                        <Text color={fs.existsSync(selectedLab.path) ? "green" : "yellow"}>
                            Status: {fs.existsSync(selectedLab.path) ? "Installed" : "Not Installed"}
                        </Text>
                    </Box>

                    {deployError && <Text color="red" bold>Error: {deployError}</Text>}

                    <Box marginTop={1}>
                        <Text inverse color="green"> [ ENTER TO {fs.existsSync(selectedLab.path) ? 'CONFIGURE' : 'INSTALL'} ] </Text>
                        <Text>  </Text>
                        {fs.existsSync(selectedLab.path) && <Text inverse color="red"> [ S TO STOP ] </Text>}
                    </Box>
                </Box>
            )}

            {view === 'downloading' && (
                <Box flexDirection="column" alignItems="center" justifyContent="center" height={10}>
                    <Text color="cyan" bold>Downloading Lab...</Text>
                    <Text>{downloadStatus}</Text>
                </Box>
            )}

            {view === 'config' && (
                <EnvForm
                    vars={envVars}
                    onSubmit={startDeploy}
                    onCancel={() => setView('details')}
                />
            )}

            {(view === 'deploying' || view === 'active') && (
                <Box flexDirection="column">
                    <Text color="orange" bold>{view === 'deploying' ? 'Deploying...' : 'Deployment Successful!'}</Text>

                    {view === 'active' && containerStatus.length > 0 && (
                        <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1} marginY={1}>
                            <Text underline>Service Status:</Text>
                            {containerStatus.map((c, i) => (
                                <Box key={i} flexDirection="column" marginTop={1}>
                                    <Text color="green" bold>✔ {c.name}</Text>
                                    <Text>  State: {c.state}</Text>
                                    <Text>  Access: {c.ports || 'Internal Only'}</Text>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Box borderStyle="single" padding={1} flexDirection="column" borderColor="green" height={10}>
                        <Text underline>Logs:</Text>
                        {logs.slice(-8).map((log, i) => <Text key={i}>{log}</Text>)}
                    </Box>

                    {view === 'active' && <Text dimColor>Press Esc to back</Text>}
                </Box>
            )}
        </Box>
    );
};

export default App;
