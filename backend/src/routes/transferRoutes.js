import { Router } from 'express';
import { store } from '../data/dataStore.js';

export const transferRouter = Router();

transferRouter.get('/', (req, res) => {
  res.json({
    success: true,
    transfers: store.getTransfers()
  });
});

transferRouter.post('/approve', (req, res) => {
  try {
    const {
      recommendationId,
      donorFacilityId,
      recipientFacilityId,
      medicineId,
      quantity,
      approverName,
      notes
    } = req.body;

    if (!donorFacilityId || !recipientFacilityId || !medicineId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required transfer execution fields (donorFacilityId, recipientFacilityId, medicineId, quantity)'
      });
    }

    const executedRecord = store.executeTransfer({
      recommendationId,
      donorFacilityId,
      recipientFacilityId,
      medicineId,
      quantity,
      approverName: approverName || 'Clinical Lead (IBM Z Datathon)',
      notes
    });

    res.json({
      success: true,
      message: `Successfully approved and dispatched ${executedRecord.quantity} units from ${donorFacilityId} to ${recipientFacilityId}.`,
      transfer: executedRecord
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
