import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const createTaskSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  isMandatory: z.boolean().default(true),
  requiresPhoto: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string(),
  completedBy: z.string(),
  notes: z.string().optional(),
});

// GET - Get tasks for a job card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await db.jcTask.findMany({
      where: { jobCardId: id },
      orderBy: [{ sequence: 'asc' }, { taskNumber: 'asc' }],
    });

    return apiSuccess({
      data: tasks.map(t => ({
        id: t.id,
        taskNumber: t.taskNumber,
        description: t.description,
        isMandatory: t.isMandatory,
        requiresPhoto: t.requiresPhoto,
        isComplete: t.isComplete,
        completedAt: t.completedAt,
        completedBy: t.completedBy,
        notes: t.notes,
        sequence: t.sequence,
        photoCount: t.photoCount,
      })),
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return apiError('Failed to fetch tasks', 500);
  }
}

// POST - Create a new task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
    });

    if (!jobCard) {
      return apiError('Job card not found', 404);
    }

    // Get max task number
    const maxTask = await db.jcTask.findFirst({
      where: { jobCardId: id },
      orderBy: { taskNumber: 'desc' },
      select: { taskNumber: true },
    });

    const taskNumber = (maxTask?.taskNumber || 0) + 1;

    const task = await db.jcTask.create({
      data: {
        jobCardId: id,
        taskNumber,
        description: result.data.description,
        isMandatory: result.data.isMandatory,
        requiresPhoto: result.data.requiresPhoto,
        notes: result.data.notes,
        sequence: taskNumber,
      },
    });

    return apiSuccess({
      id: task.id,
      taskNumber: task.taskNumber,
      description: task.description,
      isMandatory: task.isMandatory,
      requiresPhoto: task.requiresPhoto,
      isComplete: task.isComplete,
      sequence: task.sequence,
    }, 'Task created successfully', 201);
  } catch (error) {
    console.error('Create task error:', error);
    return apiError('Failed to create task', 500);
  }
}

// PATCH - Update task (mark as complete)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = updateTaskSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { taskId, completedBy, notes } = result.data;

    // Verify task belongs to this job card
    const task = await db.jcTask.findFirst({
      where: { id: taskId, jobCardId: id },
    });

    if (!task) {
      return apiError('Task not found', 404);
    }

    if (task.isComplete) {
      return apiError('Task is already completed', 400);
    }

    const updatedTask = await db.jcTask.update({
      where: { id: taskId },
      data: {
        isComplete: true,
        completedAt: new Date(),
        completedBy: completedBy,
        notes: notes || task.notes,
      },
    });

    return apiSuccess({
      id: updatedTask.id,
      taskNumber: updatedTask.taskNumber,
      description: updatedTask.description,
      isComplete: updatedTask.isComplete,
      completedAt: updatedTask.completedAt,
      completedBy: updatedTask.completedBy,
    }, 'Task marked as complete');
  } catch (error) {
    console.error('Update task error:', error);
    return apiError('Failed to update task', 500);
  }
}
