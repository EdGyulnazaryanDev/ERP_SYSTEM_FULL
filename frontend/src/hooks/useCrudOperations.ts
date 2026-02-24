import { useState } from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BaseService } from '@/services/BaseService';

export function useCrudOperations<T>(
  service: BaseService<T>,
  queryKey: string[]
) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<T | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => service.create(data),
    onSuccess: () => {
      message.success('Created successfully');
      queryClient.invalidateQueries({ queryKey });
      closeModal();
    },
    onError: () => {
      message.error('Failed to create');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<T> }) =>
      service.update(id, data),
    onSuccess: () => {
      message.success('Updated successfully');
      queryClient.invalidateQueries({ queryKey });
      closeModal();
    },
    onError: () => {
      message.error('Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => service.delete(id),
    onSuccess: () => {
      message.success('Deleted successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      message.error('Failed to delete');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: (string | number)[]) => service.bulkDelete(ids),
    onSuccess: () => {
      message.success('Bulk delete successful');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      message.error('Bulk delete failed');
    },
  });

  const openModal = (record?: T) => {
    if (record) {
      setEditingRecord(record);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return {
    isModalOpen,
    editingRecord,
    openModal,
    closeModal,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkDeleteMutation,
  };
}
