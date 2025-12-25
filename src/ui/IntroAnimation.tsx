import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

interface IntroAnimationProps {
    onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing core systems...');

    useEffect(() => {
        const steps = [
            { text: 'Loading design tokens...', delay: 800 },
            { text: 'Hydrating garden patches...', delay: 1600 },
            { text: 'Checking soil pH levels...', delay: 2400 },
            { text: 'Germinating seeds...', delay: 3200 },
            { text: 'Ready!', delay: 3800 }
        ];

        let currentDelay = 0;

        steps.forEach((s, i) => {
            currentDelay = s.delay;
            setTimeout(() => {
                setLoadingText(s.text);
                setStep(i + 1);
            }, s.delay);
        });

        setTimeout(() => {
            onComplete();
        }, 4500); // Total duration

    }, [onComplete]);

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={20}>
            <Box marginBottom={1}>
                <Text italic color="gray">senuk's</Text>
            </Box>

            <Gradient name="summer">
                <BigText text="BOILERPLATES" align='center' font='block' />
            </Gradient>

            <Box marginTop={2} width={60} flexDirection="column" alignItems="center">
                <Box borderStyle="single" borderColor="green" width="100%" paddingX={1}>
                    {/* Progress Bar */}
                    <Text color="green">
                        {'█'.repeat(Math.floor((step / 5) * 56))}
                        {'░'.repeat(56 - Math.floor((step / 5) * 56))}
                    </Text>
                </Box>
                <Box marginTop={1}>
                    <Text color="cyan">
                        {step < 5 ? '⠋' : '✔'} {loadingText}
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};

export default IntroAnimation;
