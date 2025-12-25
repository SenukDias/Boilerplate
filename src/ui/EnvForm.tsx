import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { EnvVar } from '../lib/env.js';

interface EnvFormProps {
    vars: EnvVar[];
    onSubmit: (values: Record<string, string>) => void;
    onCancel: () => void;
}

const EnvForm: React.FC<EnvFormProps> = ({ vars, onSubmit, onCancel }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        const initial: Record<string, string> = {};
        vars.forEach(v => {
            initial[v.key] = v.defaultValue || v.value || '';
        });
        setValues(initial);
    }, [vars]);

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
            return;
        }

        if (key.upArrow) {
            setFocusedIndex(prev => Math.max(0, prev - 1));
        }

        if (key.downArrow) {
            setFocusedIndex(prev => Math.min(vars.length, prev + 1));
        }

        if (key.return) {
            if (focusedIndex === vars.length) {
                onSubmit(values);
            } else {
                // Move to next field on Enter
                setFocusedIndex(prev => Math.min(vars.length, prev + 1));
            }
        }
    });

    return (
        <Box flexDirection="column" borderStyle="double" borderColor="magenta" padding={1}>
            <Text bold color="magenta" underline>Configuration</Text>
            <Box flexDirection="column" marginTop={1}>
                {vars.map((v, i) => (
                    <Box key={v.key} flexDirection="column" marginTop={1}>
                        <Box justifyContent="space-between">
                            <Text color={i === focusedIndex ? "cyan" : "white"} bold={i === focusedIndex}>
                                {i === focusedIndex ? "> " : "  "} {v.key}
                            </Text>
                            <Text color={v.required ? "red" : "gray"}>
                                {v.required ? '(Required)' : '(Optional)'}
                            </Text>
                        </Box>
                        <Box
                            borderStyle="single"
                            borderColor={i === focusedIndex ? "cyan" : "gray"}
                            marginLeft={2}
                            paddingX={1}
                        >
                            {i === focusedIndex ? (
                                <TextInput
                                    value={values[v.key] || ''}
                                    onChange={(val) => setValues({ ...values, [v.key]: val })}
                                    placeholder={v.defaultValue}
                                />
                            ) : (
                                <Text color={values[v.key] ? "white" : "gray"}>
                                    {values[v.key] || (v.defaultValue ? `${v.defaultValue}` : '')}
                                </Text>
                            )}
                        </Box>
                        {i === focusedIndex && v.defaultValue && (
                            <Box marginLeft={2} marginTop={0}>
                                <Text color="yellow" dimColor>✨ Magic Value: {v.defaultValue}</Text>
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>

            <Box marginTop={2} justifyContent="center">
                <Box
                    borderStyle={focusedIndex === vars.length ? "round" : undefined}
                    borderColor="green"
                    paddingX={2}
                >
                    <Text
                        color={focusedIndex === vars.length ? "green" : "gray"}
                        bold={focusedIndex === vars.length}
                    >
                        [ DEPLOY NOW ]
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

export default EnvForm;
