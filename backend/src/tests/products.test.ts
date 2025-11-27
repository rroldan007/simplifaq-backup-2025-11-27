import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Product Endpoints', () => {
  let authToken: string;
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
        vatNumber: 'CHE-123.456.789',
        street: '123 Test Street',
        postalCode: '1000',
        city: 'Lausanne',
        canton: 'VD',
        country: 'Switzerland',
      },
    });

    userId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        unitPrice: 100.50,
        tvaRate: 8.10,
        unit: 'piece',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: productData.name,
        description: productData.description,
        unitPrice: productData.unitPrice,
        tvaRate: productData.tvaRate,
        unit: productData.unit,
        userId,
        isActive: true,
      });

      productId = response.body.data.id;
    });

    it('should return 400 for invalid TVA rate', async () => {
      const productData = {
        name: 'Invalid Product',
        unitPrice: 100,
        tvaRate: 15.5, // Invalid TVA rate
        unit: 'piece',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields', async () => {
      const productData = {
        description: 'Missing required fields',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const productData = {
        name: 'Unauthorized Product',
        unitPrice: 100,
        tvaRate: 8.10,
        unit: 'piece',
      };

      await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);
    });
  });

  describe('GET /api/products', () => {
    beforeAll(async () => {
      // Create additional test products
      await prisma.product.createMany({
        data: [
          {
            name: 'Product A',
            description: 'First product',
            unitPrice: 50.0,
            tvaRate: 8.10,
            unit: 'piece',
            userId,
            isActive: true,
          },
          {
            name: 'Product B',
            description: 'Second product',
            unitPrice: 75.0,
            tvaRate: 3.50,
            unit: 'hour',
            userId,
            isActive: false,
          },
        ],
      });
    });

    it('should return all products for authenticated user', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/products?search=Product A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Product A');
    });

    it('should filter products by active status', async () => {
      const response = await request(app)
        .get('/api/products?isActive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((product: any) => {
        expect(product.isActive).toBe(true);
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/products')
        .expect(401);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return specific product for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(productId);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/products/${productId}`)
        .expect(401);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product with valid data', async () => {
      const updateData = {
        name: 'Updated Product',
        unitPrice: 150.75,
        tvaRate: 3.50,
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.unitPrice).toBe(updateData.unitPrice);
      expect(response.body.data.tvaRate).toBe(updateData.tvaRate);
    });

    it('should return 400 for invalid update data', async () => {
      const updateData = {
        unitPrice: -50, // Invalid negative price
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/products/${productId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productToDeleteId: string;

    beforeEach(async () => {
      // Create a product to delete
      const product = await prisma.product.create({
        data: {
          name: 'Product to Delete',
          unitPrice: 25.0,
          tvaRate: 8.10,
          unit: 'piece',
          userId,
        },
      });
      productToDeleteId = product.id;
    });

    it('should hard delete product not used in invoices', async () => {
      const response = await request(app)
        .delete(`/api/products/${productToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('supprimé avec succès');

      // Verify product is deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: productToDeleteId },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should soft delete product used in invoices', async () => {
      // First create an invoice with this product
      const client = await prisma.client.create({
        data: {
          companyName: 'Test Client',
          email: 'client@test.com',
          street: '123 Client Street',
          postalCode: '1000',
          city: 'Lausanne',
          canton: 'VD',
          country: 'Switzerland',
          userId,
        },
      });

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          clientId: client.id,
          userId,
          issueDate: new Date(),
          dueDate: new Date(),
          status: 'DRAFT',
          subtotal: 100,
          tvaAmount: 8.10,
          total: 108.10,
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: productToDeleteId,
          description: 'Test item',
          quantity: 1,
          unitPrice: 100,
          tvaRate: 8.10,
          total: 108.10,
        },
      });

      const response = await request(app)
        .delete(`/api/products/${productToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('désactivé');

      // Verify product is soft deleted (isActive = false)
      const softDeletedProduct = await prisma.product.findUnique({
        where: { id: productToDeleteId },
      });
      expect(softDeletedProduct).not.toBeNull();
      expect(softDeletedProduct?.isActive).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = 'non-existent-id';
      const response = await request(app)
        .delete(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/products/${productToDeleteId}`)
        .expect(401);
    });
  });
});