import { useState } from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BaseService } from '@/services/BaseService';

export function useCrudOperations<T extends { id: string | number }>(
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
    // Optimistic update — reflect change instantly, rollback on error
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const list: T[] = Array.isArray(old) ? old : (old?.data ?? []);
        const updated = list.map((item) => item.id === id ? { ...item, ...data } : item);
        return Array.isArray(old) ? updated : { ...old, data: updated };
      });
      return { previous };
    },
    onSuccess: () => {
      message.success('Updated successfully');
      queryClient.invalidateQueries({ queryKey });
      closeModal();
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      message.error('Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => service.delete(id),
    // Optimistic delete
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const list: T[] = Array.isArray(old) ? old : (old?.data ?? []);
        const filtered = list.filter((item) => item.id !== id);
        return Array.isArray(old) ? filtered : { ...old, data: filtered, total: (old.total ?? 1) - 1 };
      });
      return { previous };
    },
    onSuccess: () => {
      message.success('Deleted successfully');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      message.error('Failed to delete');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: (string | number)[]) => service.bulkDelete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const list: T[] = Array.isArray(old) ? old : (old?.data ?? []);
        const filtered = list.filter((item) => !ids.includes(item.id));
        return Array.isArray(old) ? filtered : { ...old, data: filtered, total: (old.total ?? ids.length) - ids.length };
      });
      return { previous };
    },
    onSuccess: () => {
      message.success('Bulk delete successful');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      message.error('Bulk delete failed');
    },
  });

  const openModal = (record?: T) => {
    if (record) setEditingRecord(record);
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
