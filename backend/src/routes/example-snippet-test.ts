// 🧪 ARCHIVO DE PRUEBA - Eliminar después de probar snippets
// 
// Instrucciones:
// 1. Abre este archivo en VSCode
// 2. Borra todo el contenido
// 3. Escribe: api-success
// 4. Presiona TAB
// 5. ¡Magia! El código se completa automáticamente
//
// Prueba también:
// - api-error + TAB
// - endpoint-auth + TAB
// - prisma-userid + TAB
// - try-log + TAB

import { Request, Response, Router } from 'express';
import { successResponse, errorResponse, ErrorCodes } from '../utils/apiResponse';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// TODO: Escribir "endpoint-auth" + TAB aquí abajo y ver la magia 👇

