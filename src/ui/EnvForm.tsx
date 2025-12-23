import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
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

    useInput((input: string, key: any) => {
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
            }
        }

        if (focusedIndex < vars.length && !key.ctrl && !key.meta && !key.return && !key.upArrow && !key.downArrow) {
            const currentVar = vars[focusedIndex];
            const currentVal = values[currentVar.key] || '';

            if (key.backspace || key.delete) {
                setValues({ ...values, [currentVar.key]: currentVal.slice(0, -1) });
            } else {
                setValues({ ...values, [currentVar.key]: currentVal + input });
            }
        }
    });

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="orange" padding={1}>
            <Text bold color="orange" underline>Configuration</Text>
            {vars.map((v, i) => (
                <Box key={v.key} flexDirection="column" marginTop={1}>
                    <Box justifyContent="space-between">
                        <Text color={i === focusedIndex ? "orange" : "white"} bold={i === focusedIndex}>
                            {i === focusedIndex ? "> " : "  "} {v.key}
                        </Text>
                        <Text color={v.required ? "red" : "gray"}>
                            {v.required ? '(Required)' : '(Optional)'}
                        </Text>
                    </Box>
                    <Box borderStyle="single" borderColor={i === focusedIndex ? "green" : "gray"} marginLeft={2}>
                        <Text color={values[v.key] ? "white" : "gray"}>
                            {values[v.key] || (v.defaultValue ? `${v.defaultValue} (default)` : ' ')}
                        </Text>
                    </Box>
                    {i === focusedIndex && v.defaultValue && (
                        <Box marginLeft={2}>
                            <Text dimColor>Default: {v.defaultValue}</Text>
                        </Box>
                    )}
                </Box>
            ))}

            <Box marginTop={2} justifyContent="center">
                <Text
                    color={focusedIndex === vars.length ? "black" : "green"}
                    backgroundColor={focusedIndex === vars.length ? "green" : undefined}
                >
                    [ DEPLOY NOW ]
                </Text>
            </Box>
        </Box>
    );
};

export default EnvForm;
