/**
 * Environment setup for tests
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Override NODE_ENV to ensure test environment
process.env.NODE_ENV = 'test';