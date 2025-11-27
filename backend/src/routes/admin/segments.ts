import express, { Request, Response } from 'express';
import { z } from 'zod';
import { CommunicationService } from '../../services/communicationService';
import { requirePermission, auditLog } from '../../middleware/adminAuth';

// User type is already declared in auth.ts middleware
// No need to redeclare it here

const router = express.Router();

// Schema for segment criteria, aligning with Prisma's SegmentCriteria type
const segmentCriteriaSchema = z.object({
  plans: z.array(z.string()).optional(),
  subscriptionStatus: z.array(z.string()).optional(),
  registrationDateRange: z.object({
    start: z.string().optional(), // Keep as string for service compatibility
    end: z.string().optional(),   // Keep as string for service compatibility
  }).optional(),
}).passthrough();

// Schema for creating a segment
const createSegmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  criteria: segmentCriteriaSchema,
  isDynamic: z.boolean().default(true),
});

// Schema for updating a segment
const updateSegmentSchema = createSegmentSchema.partial();

// GET / - Get all segments
router.get('/', requirePermission('segments', 'read'), async (req: Request, res: Response) => {
  try {
    const segments = await CommunicationService.getUserSegments();
    res.json(segments);
  } catch (error) {
    console.error('Failed to fetch user segments:', error);
    res.status(500).json({ message: 'Failed to fetch user segments' });
  }
});

// POST / - Create a new segment
router.post('/', requirePermission('segments', 'write'), auditLog('create_segment', 'segment'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const segmentData = createSegmentSchema.parse(req.body);
    const newSegment = await CommunicationService.createUserSegment({
      ...segmentData,
      createdBy: req.user.id, // Add createdBy from authenticated user
    });
    res.status(201).json(newSegment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid data', errors: error.issues });
      return;
    }
    console.error('Failed to create user segment:', error);
    res.status(500).json({ message: 'Failed to create user segment' });
  }
});

// GET /:id - Get a single segment
router.get('/:id', requirePermission('segments', 'read'), async (req: Request, res: Response): Promise<void> => {
  try {
    const segment = await CommunicationService.getUserSegmentById(req.params.id);
    if (!segment) {
      res.status(404).json({ message: 'Segment not found' });
      return;
    }
    res.json(segment);
  } catch (error) {
    console.error(`Failed to fetch segment ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to fetch user segment' });
  }
});

// PUT /:id - Update a segment
router.put('/:id', requirePermission('segments', 'write'), auditLog('update_segment', 'segment', (req) => req.params.id), async (req: Request, res: Response): Promise<void> => {
  try {
    const segmentData = updateSegmentSchema.parse(req.body);
    const updatedSegment = await CommunicationService.updateUserSegment(req.params.id, segmentData);
    res.json(updatedSegment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid data', errors: error.issues });
      return;
    }
    console.error(`Failed to update segment ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to update user segment' });
  }
});

// DELETE /:id - Delete a segment
router.delete('/:id', requirePermission('segments', 'write'), auditLog('delete_segment', 'segment', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await CommunicationService.deleteUserSegment(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete segment ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to delete user segment' });
  }
});

export default router;
