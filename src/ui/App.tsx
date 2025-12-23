import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { getLabs, Lab } from '../lib/labs.js';
import { getRequiredEnvVars, EnvVar, saveEnvFile, loadExistingEnv } from '../lib/env.js';
import { deployLab, stopLab } from '../lib/docker.js';
import EnvForm from './EnvForm.js';
import Header from './Header.js';

const App = () => {
    const { exit } = useApp();
    const [labs, setLabs] = useState<Lab[]>([]);
    const [view, setView] = useState<'list' | 'details' | 'config' | 'deploying' | 'active'>('list');

    // Search & Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectIndex, setSelectIndex] = useState(0);

    // Deployment State
    const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [deployError, setDeployError] = useState<string | null>(null);

    useEffect(() => {
        setLabs(getLabs());
    }, []);

    // Derived list of filtered labs
    const filteredLabs = labs.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Create categorized map for display (only if not searching strictly?)
    // Actually, simple list with category headers is easier for navigation with search

    useInput((input: string, key: any) => {
        if (view === 'deploying') return;

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
            // Page Up/Down could go here
            if (key.return) {
                if (filteredLabs[selectIndex]) {
                    setSelectedLab(filteredLabs[selectIndex]);
                    setView('details');
                }
            }
        }

        if (view === 'details') {
            if (key.return) { // Configure
                if (selectedLab) {
                    const vars = getRequiredEnvVars(selectedLab);
                    const existing = loadExistingEnv(selectedLab);
                    vars.forEach(v => {
                        if (existing[v.key]) v.value = existing[v.key];
                    });

                    if (vars.length > 0) {
                        setEnvVars(vars);
                        setView('config');
                    } else {
                        startDeploy({});
                    }
                }
            }
            if (input === 's' && selectedLab) {
                stopLab(selectedLab.path, (log) => setLogs(prev => [...prev.slice(-10), log]))
                    .then(() => setLogs(prev => [...prev, 'Stopped.']))
                    .catch(e => setLogs(prev => [...prev, e.message]));
            }
        }
    });

    const startDeploy = async (values: Record<string, string>) => {
        if (!selectedLab) return;
        saveEnvFile(selectedLab, values);
        setView('deploying');
        setLogs(['Starting deployment...']);
        setDeployError(null);

        try {
            await deployLab(selectedLab.path, values, (log) => {
                setLogs(prev => [...prev.slice(-10), log.trim()]);
            });
            setView('active');
        } catch (e: any) {
            setDeployError(e.message);
            setView('details'); // Go back to details to show error
        }
    };

    if (labs.length === 0) {
        return <Text>No labs found in {process.cwd()}/labs</Text>;
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

                    <Text underline>Deployed Catalog:</Text>
                    {filteredLabs.slice(0, 15).map((lab, index) => ( // limit display
                        <Box key={lab.path} justifyContent="space-between">
                            <Text color={index === selectIndex ? "cyan" : "white"}>
                                {index === selectIndex ? "> " : "  "}
                                {lab.name}
                            </Text>
                            <Text color="gray">[{lab.category}]</Text>
                        </Box>
                    ))}
                    {filteredLabs.length === 0 && <Text italic>No labs found</Text>}

                    <Box marginTop={1}>
                        <Text dimColor>Arrows to move, Enter to select, Type to search</Text>
                    </Box>
                </Box>
            )}

            {view === 'details' && selectedLab && (
                <Box flexDirection="column">
                    <Text bold color="orange">{selectedLab.name}</Text>
                    <Box borderStyle="single" borderColor="orange" padding={1}>
                        <Text>{selectedLab.description}</Text>
                        <Text dimColor>Path: {selectedLab.path}</Text>
                    </Box>

                    {deployError && <Text color="red" bold>Error: {deployError}</Text>}

                    <Box marginTop={1}>
                        <Text inverse color="green"> [ ENTER TO DEPLOY ] </Text>
                        <Text>  </Text>
                        <Text inverse color="red"> [ S TO STOP ] </Text>
                    </Box>
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
                    <Text color="orange">{view === 'deploying' ? 'Deploying...' : 'Active'}</Text>
                    <Box borderStyle="single" padding={1} flexDirection="column" borderColor="green">
                        {logs.map((log, i) => <Text key={i}>{log}</Text>)}
                    </Box>
                    {view === 'active' && <Text color="green" bold>Deployment Successful!</Text>}
                    {view === 'active' && <Text dimColor>Press Esc to back</Text>}
                </Box>
            )}
        </Box>
    );
};

export default App;
