import express, { Request, Response } from 'express';
import { z } from 'zod';
import { CommunicationService } from '../../services/communicationService';
import { requirePermission } from '../../middleware/adminAuth';
import { auditLog, AdminAuthRequest } from '../../middleware/adminAuth';

const router = express.Router();

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  language: z.string().default('en'),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/admin/templates - Get all email templates
router.get('/', requirePermission('templates', 'read'), async (req: AdminAuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await CommunicationService.getEmailTemplates(category);
    return res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return res.status(500).json({ message: 'Failed to fetch email templates' });
  }
});

// POST /api/admin/templates - Create a new email template
router.post('/', requirePermission('templates', 'write'), auditLog('create_template', 'template'), async (req: AdminAuthRequest, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ message: 'Authentication error' });
    }
    const parsedData = templateSchema.parse(req.body);
    
    const templateDto = {
      name: parsedData.name,
      subject: parsedData.subject,
      htmlContent: parsedData.htmlContent,
      textContent: parsedData.textContent,
      category: parsedData.category,
      isSystem: false, // System templates should not be created via API
    };

    const newTemplate = await CommunicationService.createEmailTemplate(templateDto, req.admin.id);
    return res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating email template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to create email template' });
  }
});

// GET /api/admin/templates/:id - Get a single email template
router.get('/:id', requirePermission('templates', 'read'), async (req: AdminAuthRequest, res: Response) => {
  try {
    const template = await CommunicationService.getEmailTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    console.error(`Error fetching email template ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to fetch email template' });
  }
});

// PUT /api/admin/templates/:id - Update an email template
router.put('/:id', requirePermission('templates', 'write'), auditLog('update_template', 'template', req => req.params.id), async (req: AdminAuthRequest, res: Response) => {
  try {
    const templateData = templateSchema.partial().parse(req.body);
    const updatedTemplate = await CommunicationService.updateEmailTemplate(req.params.id, templateData);
    return res.json(updatedTemplate);
  } catch (error) {
    console.error(`Error updating email template ${req.params.id}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to update email template' });
  }
});

// DELETE /api/admin/templates/:id - Delete an email template
router.delete('/:id', requirePermission('templates', 'write'), auditLog('delete_template', 'template', req => req.params.id), async (req: AdminAuthRequest, res: Response) => {
  try {
    await CommunicationService.deleteEmailTemplate(req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error(`Error deleting email template ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete email template' });
  }
});

export default router;
