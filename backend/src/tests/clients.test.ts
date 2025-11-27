import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';
import { generateTestToken } from './test-utils';

const prisma = new PrismaClient();

describe('Clients API', () => {
  let authToken: string;
  let testUserId: string;
  let testClientId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: 'client-test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
      },
    });
    testUserId = testUser.id;
    authToken = generateTestToken(testUser.id);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.client.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up clients before each test
    await prisma.client.deleteMany({ where: { userId: testUserId } });
  });

  describe('POST /api/clients', () => {
    const validClientData = {
      name: 'Test Client SA',
      email: 'client@example.com',
      phone: '+41 21 123 45 67',
      address: {
        street: '123 Test Street',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'CH',
        canton: 'VD',
      },
      tvaNumber: 'CHE-123.456.789 TVA',
    };

    it('should create a new client with valid data', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validClientData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: validClientData.name,
        email: validClientData.email,
        phone: validClientData.phone,
        address: validClientData.address,
        tvaNumber: validClientData.tvaNumber,
        userId: testUserId,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      testClientId = response.body.id;
    });

    it('should validate Swiss postal code', async () => {
      const invalidData = {
        ...validClientData,
        address: {
          ...validClientData.address,
          postalCode: '12345', // Invalid Swiss postal code
        },
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate Swiss canton', async () => {
      const invalidData = {
        ...validClientData,
        address: {
          ...validClientData.address,
          canton: 'XX', // Invalid canton
        },
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate Swiss TVA number format', async () => {
      const invalidData = {
        ...validClientData,
        tvaNumber: 'INVALID-TVA-NUMBER',
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Test Client',
        // Missing required fields
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...validClientData,
        email: 'invalid-email',
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate Swiss phone number format', async () => {
      const invalidData = {
        ...validClientData,
        phone: '123-456-7890', // Invalid Swiss format
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/clients')
        .send(validClientData)
        .expect(401);
    });

    it('should handle duplicate email addresses', async () => {
      // Create first client
      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validClientData)
        .expect(201);

      // Try to create second client with same email
      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validClientData)
        .expect(409); // Conflict
    });
  });

  describe('GET /api/clients', () => {
    beforeEach(async () => {
      // Create test clients
      await prisma.client.createMany({
        data: [
          {
            name: 'Client A',
            email: 'clienta@example.com',
            userId: testUserId,
            address: {
              street: '123 Street A',
              city: 'Lausanne',
              postalCode: '1000',
              country: 'CH',
              canton: 'VD',
            },
          },
          {
            name: 'Client B',
            email: 'clientb@example.com',
            userId: testUserId,
            address: {
              street: '456 Street B',
              city: 'Geneva',
              postalCode: '1201',
              country: 'CH',
              canton: 'GE',
            },
          },
        ],
      });
    });

    it('should return all clients for authenticated user', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('address');
      expect(response.body[0].userId).toBe(testUserId);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/clients?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/clients?search=Client A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Client A');
    });

    it('should support search by email', async () => {
      const response = await request(app)
        .get('/api/clients?search=clientb@example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('clientb@example.com');
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/clients?sortBy=name&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body[0].name).toBe('Client B');
      expect(response.body[1].name).toBe('Client A');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/clients')
        .expect(401);
    });

    it('should only return clients for authenticated user', async () => {
      // Create another user with clients
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      await prisma.client.create({
        data: {
          name: 'Other Client',
          email: 'other-client@example.com',
          userId: otherUser.id,
          address: {
            street: '789 Other Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH',
          },
        },
      });

      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should only return 2 clients (not the other user's client)
      expect(response.body).toHaveLength(2);
      expect(response.body.every((client: any) => client.userId === testUserId)).toBe(true);

      // Clean up
      await prisma.client.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/clients/:id', () => {
    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          email: 'test@example.com',
          userId: testUserId,
          address: {
            street: '123 Test Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD',
          },
        },
      });
      testClientId = client.id;
    });

    it('should return client by ID', async () => {
      const response = await request(app)
        .get(`/api/clients/${testClientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testClientId);
      expect(response.body.name).toBe('Test Client');
      expect(response.body.userId).toBe(testUserId);
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .get(`/api/clients/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 for client belonging to another user', async () => {
      // Create another user and client
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      const otherClient = await prisma.client.create({
        data: {
          name: 'Other Client',
          email: 'other@example.com',
          userId: otherUser.id,
          address: {
            street: '789 Other Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH',
          },
        },
      });

      await request(app)
        .get(`/api/clients/${otherClient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Clean up
      await prisma.client.delete({ where: { id: otherClient.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/clients/${testClientId}`)
        .expect(401);
    });
  });

  describe('PUT /api/clients/:id', () => {
    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          email: 'test@example.com',
          userId: testUserId,
          address: {
            street: '123 Test Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD',
          },
        },
      });
      testClientId = client.id;
    });

    const updateData = {
      name: 'Updated Client SA',
      email: 'updated@example.com',
      phone: '+41 22 987 65 43',
      address: {
        street: '456 Updated Street',
        city: 'Geneva',
        postalCode: '1201',
        country: 'CH',
        canton: 'GE',
      },
      tvaNumber: 'CHE-987.654.321 TVA',
    };

    it('should update client with valid data', async () => {
      const response = await request(app)
        .put(`/api/clients/${testClientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(response.body.id).toBe(testClientId);
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should validate updated data', async () => {
      const invalidData = {
        ...updateData,
        email: 'invalid-email',
      };

      await request(app)
        .put(`/api/clients/${testClientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .put(`/api/clients/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 403 for client belonging to another user', async () => {
      // Create another user and client
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      const otherClient = await prisma.client.create({
        data: {
          name: 'Other Client',
          email: 'other@example.com',
          userId: otherUser.id,
          address: {
            street: '789 Other Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH',
          },
        },
      });

      await request(app)
        .put(`/api/clients/${otherClient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      // Clean up
      await prisma.client.delete({ where: { id: otherClient.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/clients/${testClientId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          email: 'test@example.com',
          userId: testUserId,
          address: {
            street: '123 Test Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD',
          },
        },
      });
      testClientId = client.id;
    });

    it('should delete client', async () => {
      await request(app)
        .delete(`/api/clients/${testClientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify client is deleted
      const deletedClient = await prisma.client.findUnique({
        where: { id: testClientId },
      });
      expect(deletedClient).toBeNull();
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .delete(`/api/clients/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 for client belonging to another user', async () => {
      // Create another user and client
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      const otherClient = await prisma.client.create({
        data: {
          name: 'Other Client',
          email: 'other@example.com',
          userId: otherUser.id,
          address: {
            street: '789 Other Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH',
          },
        },
      });

      await request(app)
        .delete(`/api/clients/${otherClient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Clean up
      await prisma.client.delete({ where: { id: otherClient.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/clients/${testClientId}`)
        .expect(401);
    });

    it('should prevent deletion of client with associated invoices', async () => {
      // Create an invoice for the client
      await prisma.invoice.create({
        data: {
          number: 'INV-001',
          clientId: testClientId,
          userId: testUserId,
          amount: 1000,
          currency: 'CHF',
          status: 'DRAFT',
          dueDate: new Date(),
          items: [],
        },
      });

      await request(app)
        .delete(`/api/clients/${testClientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409); // Conflict - cannot delete client with invoices

      // Clean up
      await prisma.invoice.deleteMany({ where: { clientId: testClientId } });
    });
  });
});