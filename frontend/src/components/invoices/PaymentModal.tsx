import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  onPaymentAdded: () => void;
}

export function PaymentModal({ isOpen, onClose, invoiceId, invoiceNumber, totalAmount, onPaymentAdded }: PaymentModalProps) {
  // Redondear el monto inicial a 2 decimales
  const roundedAmount = Math.round(totalAmount * 100) / 100;
  const [amount, setAmount] = useState(roundedAmount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Actualizar el monto cuando cambie totalAmount (cuando se abre el modal con una nueva factura)
  useEffect(() => {
    const rounded = Math.round(totalAmount * 100) / 100;
    setAmount(rounded);
  }, [totalAmount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.addPayment(invoiceId, { amount, paymentDate, notes });
      onPaymentAdded();
      onClose();
    } catch (error) {
      console.error('Error adding payment:', error);
      const msg = (error as any)?.message || 'Erreur réseau';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enregistrer un paiement pour la facture #${invoiceNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Montant</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              // Redondear a 2 decimales
              const rounded = Math.round(value * 100) / 100;
              setAmount(rounded);
            }}
            onBlur={(e) => {
              // Asegurar 2 decimales al salir del campo
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                const rounded = Math.round(value * 100) / 100;
                setAmount(rounded);
              }
            }}
            min={0.01}
            step={0.01}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Maximum 2 décimales (ex: 30.65)</p>
        </div>
        <div>
          <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Date du paiement</label>
          <input
            type="date"
            id="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        {errorMsg && (
          <div className="text-sm text-red-600">{errorMsg}</div>
        )}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !Number.isFinite(amount) || amount <= 0 || !paymentDate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
