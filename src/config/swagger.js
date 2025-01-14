// src/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Food Ordering API',
            version: '1.0.0',
            description: 'API Documentation for Food Ordering System'
        },
        servers: [
            {
                url: 'https://tst-uas-backend-swagger.onrender.com',
                description: 'Production server'
            },
            {
                url: 'http://localhost:8000',
                description: 'Development server'
            }
        ],
    },
    apis: [join(__dirname, '../routers/*.js')] // Fix the path
};

export const specs = swaggerJsdoc(options);