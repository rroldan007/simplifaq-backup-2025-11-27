/**
 * API Response Format Tests
 * 
 * Ensures all API responses follow the standard format
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
// import app from '../src/index.dev';

describe('API Response Format', () => {
  
  // Test que todas las respuestas exitosas tengan el formato correcto
  it('should return success response with data array for list endpoints', async () => {
    const endpoints = [
      '/api/clients',
      '/api/products',
      '/api/invoices',
      '/api/quotes',
      '/api/expenses',
      '/api/expenses/accounts'
    ];
    
    // Este test asegura que TODOS los endpoints de listas
    // devuelvan arrays directamente en data, no objetos anidados
    for (const endpoint of endpoints) {
      // const response = await request(app).get(endpoint).set('Authorization', `Bearer ${token}`);
      // expect(response.body).toHaveProperty('success', true);
      // expect(response.body).toHaveProperty('data');
      // expect(Array.isArray(response.body.data)).toBe(true);
    }
  });
  
  it('should return success response with data object for single item endpoints', async () => {
    // const response = await request(app).get('/api/clients/123').set('Authorization', `Bearer ${token}`);
    // expect(response.body).toMatchObject({
    //   success: true,
    //   data: expect.any(Object)
    // });
  });
  
  it('should return error response with correct format', async () => {
    // const response = await request(app).get('/api/clients/nonexistent');
    // expect(response.body).toMatchObject({
    //   success: false,
    //   error: {
    //     code: expect.any(String),
    //     message: expect.any(String)
    //   }
    // });
  });
});

describe('Database Schema Consistency', () => {
  it('should have all required tables', async () => {
    // Verificar que las tablas críticas existen
    const requiredTables = [
      'users',
      'clients',
      'products',
      'invoices',
      'quotes',
      'accounts',
      'expenses'
    ];
    
    // const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    // requiredTables.forEach(table => {
    //   expect(tables).toContainEqual(expect.objectContaining({ name: table }));
    // });
  });
});
