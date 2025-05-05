export const isDevelopment = (): boolean => {
    return process.env.FUNCTIONS_EMULATOR === 'true';
};

export const isProduction = (): boolean => {
    return !isDevelopment();
}; 