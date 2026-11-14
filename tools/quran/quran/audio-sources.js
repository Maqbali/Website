// Current gaps in the official Hafs catalog for Ahmed Talib.
const AHMED_MISSING = new Map([[9,129],[14,52],[16,128],[17,111],[23,118],[24,64],[33,73]]);
export const ahmedSurahAvailable = surah => !AHMED_MISSING.has(surah);
