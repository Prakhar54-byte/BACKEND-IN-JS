/** @type {import('jest').Config} */
const config = {
  // Load environment variables from .env file
  setupFiles: ['dotenv/config'],

  // Indicates that the project is using ES Modules
  // and Jest should respect that.
  moduleFileExtensions: ['js', 'mjs'],
  testEnvironment: 'node',
};

module.exports = config;
