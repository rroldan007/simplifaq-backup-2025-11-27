import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import templatesRouter from '../routes/admin/templates';
import { CommunicationService } from '../services/communicationService';
import { mocked } from 'jest-mock';

// Mock middleware to bypass auth and permissions for testing
jest.mock('../middleware/adminAuth', () => ({
  requirePermission: (resource: string, action: string) => (req: any, res: any, next: any) => next(),
  auditLog: (action: string, resourceType: string, resourceIdExtractor?: (req: any) => string) => (req: any, res: any, next: any) => next(),
}));

// Mock the service layer to isolate the route logic
jest.mock('../services/communicationService');

const mockedCommunicationService = mocked(CommunicationService);

const app = express();
app.use(express.json());
app.use('/api/admin/templates', templatesRouter);

const mockTemplates = [
  { id: '1', name: 'Welcome Email', subject: 'Welcome!', htmlContent: '<p>Welcome</p>', isActive: true, language: 'en', category: 'account', isSystem: true, variables: ['user_first_name'] },
  { id: '2', name: 'Password Reset', subject: 'Reset your password', htmlContent: '<p>Reset here</p>', isActive: true, language: 'es', category: 'account', isSystem: true, variables: ['reset_link'] },
];

describe('Admin Templates API', () => {
    beforeEach(() => {
    // Reset mocks before each test
    mockedCommunicationService.getEmailTemplates.mockClear();
    mockedCommunicationService.getEmailTemplateById.mockClear();
    mockedCommunicationService.createEmailTemplate.mockClear();
    mockedCommunicationService.updateEmailTemplate.mockClear();
    mockedCommunicationService.deleteEmailTemplate.mockClear();
  });

  describe('GET /api/admin/templates', () => {
    it('should return a list of email templates', async () => {
            mockedCommunicationService.getEmailTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app)
        .get('/api/admin/templates')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockTemplates);
            expect(mockedCommunicationService.getEmailTemplates).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/admin/templates/:id', () => {
    it('should return a single template if found', async () => {
      const template = mockTemplates[0];
            mockedCommunicationService.getEmailTemplateById.mockResolvedValue(template);

      const response = await request(app)
        .get(`/api/admin/templates/${template.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(template);
            expect(mockedCommunicationService.getEmailTemplateById).toHaveBeenCalledWith(template.id);
    });

    it('should return 404 if template not found', async () => {
            mockedCommunicationService.getEmailTemplateById.mockResolvedValue(null);

      await request(app)
        .get('/api/admin/templates/999')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  describe('POST /api/admin/templates', () => {
    it('should create a new template with valid data', async () => {
            const newTemplateData = { name: 'New Template', subject: 'Subj', htmlContent: '<p>Hi</p>', language: 'en', category: 'marketing', variables: [] };
      const createdTemplate = { id: '3', ...newTemplateData, isActive: true, isSystem: false, variables: [] };
            mockedCommunicationService.createEmailTemplate.mockResolvedValue(createdTemplate);

      const response = await request(app)
        .post('/api/admin/templates')
        .send(newTemplateData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual(createdTemplate);
                        expect(mockedCommunicationService.createEmailTemplate).toHaveBeenCalledWith(expect.objectContaining(newTemplateData));
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { name: 'Only name' }; // Missing required fields

      const response = await request(app)
        .post('/api/admin/templates')
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/admin/templates/:id', () => {
    it('should update an existing template', async () => {
      const template = mockTemplates[0];
                  const updateData = { subject: 'New Subject' };
      const updatedTemplate = { ...template, ...updateData };
      mockedCommunicationService.getEmailTemplateById.mockResolvedValue(template); // Ensure the template exists for the update
            mockedCommunicationService.updateEmailTemplate.mockResolvedValue(updatedTemplate);

      const response = await request(app)
        .put(`/api/admin/templates/${template.id}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(updatedTemplate);
                              expect(mockedCommunicationService.updateEmailTemplate).toHaveBeenCalledWith(template.id, expect.objectContaining(updateData));
    });
  });

  describe('DELETE /api/admin/templates/:id', () => {
    it('should delete a template and return 204', async () => {
      const templateId = '1';
            mockedCommunicationService.deleteEmailTemplate.mockResolvedValue(undefined as any); // Cast to any to satisfy mock

      await request(app)
        .delete(`/api/admin/templates/${templateId}`)
        .expect(204);

            expect(mockedCommunicationService.deleteEmailTemplate).toHaveBeenCalledWith(templateId);
    });
  });
});
