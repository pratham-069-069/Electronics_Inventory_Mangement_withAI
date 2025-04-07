import { Router } from 'express';
import {
    getAllReports,
    addReport,
    getReportById, // Added route for getting specific report
    updateReport,
    deleteReport
} from '../controllers/report.controller.js';

const router = Router();

router.get('/', getAllReports);
router.post('/', addReport);
router.get('/:id', getReportById); // Route to get a specific report by ID
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;