import { useState } from 'react';
import { Modal, Upload, Button, Table, Select, message, Steps } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { ModuleField } from '@/types';
import * as XLSX from 'xlsx';

interface BulkImportProps {
  visible: boolean;
  onClose: () => void;
  fields: ModuleField[];
  onImport: (data: Record<string, unknown>[], mapping: Record<string, string>) => Promise<void>;
}

export default function BulkImport({ visible, onClose, fields, onImport }: BulkImportProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileData, setFileData] = useState<unknown[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file: UploadFile) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
        
        if (jsonData.length > 0) {
          setHeaders(jsonData[0] as string[]);
          setFileData(jsonData.slice(1));
          setCurrentStep(1);
        }
      } catch (error) {
        message.error('Failed to parse file');
      }
    };

    reader.readAsArrayBuffer(file as unknown as Blob);
    return false;
  };

  const handleMapping = (fileColumn: string, moduleField: string) => {
    setMapping((prev) => ({ ...prev, [fileColumn]: moduleField }));
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const mappedData = fileData.map((row) => {
        const record: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const fieldName = mapping[header];
          if (fieldName) {
            record[fieldName] = row[index];
          }
        });
        return record;
      });

      await onImport(mappedData, mapping);
      message.success(`Imported ${mappedData.length} records`);
      handleClose();
    } catch (error) {
      message.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFileData([]);
    setHeaders([]);
    setMapping({});
    onClose();
  };

  const mappingColumns = [
    {
      title: 'File Column',
      dataIndex: 'fileColumn',
      key: 'fileColumn',
    },
    {
      title: 'Map To',
      dataIndex: 'mapping',
      key: 'mapping',
      render: (_: unknown, record: { fileColumn: string }) => (
        <Select
          className="w-full"
          placeholder="Select field"
          value={mapping[record.fileColumn]}
          onChange={(value) => handleMapping(record.fileColumn, value)}
          options={fields.map((field) => ({
            label: field.displayName,
            value: field.name,
          }))}
        />
      ),
    },
    {
      title: 'Sample Data',
      dataIndex: 'sample',
      key: 'sample',
    },
  ];

  const mappingData = headers.map((header, index) => ({
    key: header,
    fileColumn: header,
    sample: fileData[0]?.[index],
  }));

  return (
    <Modal
      title="Bulk Import"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
    >
      <Steps
        current={currentStep}
        items={[
          { title: 'Upload File' },
          { title: 'Map Columns' },
          { title: 'Import' },
        ]}
        className="mb-6"
      />

      {currentStep === 0 && (
        <div className="text-center py-8">
          <Upload
            accept=".xlsx,.xls,.csv"
            beforeUpload={handleFileUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} size="large">
              Upload Excel/CSV File
            </Button>
          </Upload>
          <p className="mt-4 text-gray-500">
            Supported formats: .xlsx, .xls, .csv
          </p>
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <p className="mb-4">Map your file columns to module fields:</p>
          <Table
            columns={mappingColumns}
            dataSource={mappingData}
            pagination={false}
            size="small"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button
              type="primary"
              onClick={() => setCurrentStep(2)}
              disabled={Object.keys(mapping).length === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="text-center py-8">
          <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
          <h3 className="text-xl mb-2">Ready to Import</h3>
          <p className="text-gray-600 mb-6">
            {fileData.length} records will be imported
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => setCurrentStep(1)}>Back</Button>
            <Button
              type="primary"
              onClick={handleImport}
              loading={loading}
            >
              Import Now
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
