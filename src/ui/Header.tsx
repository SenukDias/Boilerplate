import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

const Header = () => {
    return (
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Box>
                <Text color="#87CEEB">                  .   .                 .   .   </Text>
            </Box>
            <Box>
                <Text color="#87CEEB">         Top of the Morning!   🐦   v   v     v </Text>
            </Box>
            <Box marginTop={1}>
                <Text italic color="gray">senuk's</Text>
            </Box>
            <Gradient name="summer">
                <BigText text="BOILERPLATES" align='center' font='block' />
            </Gradient>
            <Box>
                <Text color="green">  Create your own digital garden.  🌱  🌿  🌳 </Text>
            </Box>
        </Box>
    );
};

export default Header;
