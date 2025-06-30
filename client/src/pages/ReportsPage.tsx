import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Form,
  FormField,
  Select,
  DateInput,
  Button,
  Grid,
  Notification,
} from 'grommet';
import { Download, DocumentText } from 'grommet-icons';
import { useApi } from '../contexts/ApiContext';

interface ReportFilters {
  reportType: string;
  datacenter: string;
  dateFrom: string;
  dateTo: string;
  severity: string;
  status: string;
}

function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'audits',
    datacenter: '',
    dateFrom: '',
    dateTo: '',
    severity: '',
    status: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/reports/generate?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('audit-tool-token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get the blob and create a download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filters.reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Report generated and downloaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: 'audits', label: 'Audits Summary Report' },
    { value: 'issues', label: 'Issues Detailed Report' },
    { value: 'incidents', label: 'Incidents Report' },
  ];

  const datacenters = [
    'Canada - Quebec',
    'Norway - Enebakk',
    'Norway - Rjukan',
    'United States - Dallas',
    'United States - Houston',
  ];

  return (
    <Box fill gap="medium">
      {/* Header */}
      <Box>
        <Heading level="2" margin="none">
          Reports
        </Heading>
        <Text color="text-weak">
          Generate and download detailed reports
        </Text>
      </Box>

      {error && (
        <Notification
          status="critical"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {success && (
        <Notification
          status="normal"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      <Grid columns={['2/3', '1/3']} gap="large">
        {/* Report Configuration */}
        <Card>
          <CardHeader pad="medium" background="light-2">
            <Box direction="row" align="center" gap="small">
              <DocumentText size="small" />
              <Heading level="4" margin="none">Report Configuration</Heading>
            </Box>
          </CardHeader>
          <CardBody pad="medium">
            <Form>
              <FormField label="Report Type" required>
                <Select
                  placeholder="Select report type"
                  value={filters.reportType}
                  onChange={({ value }) => handleFilterChange('reportType', value)}
                  options={reportTypes}
                  labelKey="label"
                  valueKey="value"
                />
              </FormField>

              <Grid columns={['1/2', '1/2']} gap="medium">
                <FormField label="Date From">
                  <DateInput
                    value={filters.dateFrom}
                    onChange={({ value }) => 
                      handleFilterChange('dateFrom', Array.isArray(value) ? value[0] : value)
                    }
                    calendarProps={{
                      bounds: ['2024-01-01', new Date().toISOString().split('T')[0]]
                    }}
                  />
                </FormField>
                <FormField label="Date To">
                  <DateInput
                    value={filters.dateTo}
                    onChange={({ value }) => 
                      handleFilterChange('dateTo', Array.isArray(value) ? value[0] : value)
                    }
                    calendarProps={{
                      bounds: [filters.dateFrom || '2024-01-01', new Date().toISOString().split('T')[0]]
                    }}
                  />
                </FormField>
              </Grid>

              <FormField label="Datacenter">
                <Select
                  placeholder="All Datacenters"
                  value={filters.datacenter}
                  onChange={({ value }) => handleFilterChange('datacenter', value)}
                  options={datacenters}
                  clear
                />
              </FormField>

              {filters.reportType === 'issues' && (
                <Grid columns={['1/2', '1/2']} gap="medium">
                  <FormField label="Severity">
                    <Select
                      placeholder="All Severities"
                      value={filters.severity}
                      onChange={({ value }) => handleFilterChange('severity', value)}
                      options={['critical', 'warning', 'healthy']}
                      clear
                    />
                  </FormField>
                  <FormField label="Status">
                    <Select
                      placeholder="All Status"
                      value={filters.status}
                      onChange={({ value }) => handleFilterChange('status', value)}
                      options={['open', 'resolved']}
                      clear
                    />
                  </FormField>
                </Grid>
              )}

              <Box margin={{ top: 'medium' }}>
                <Button
                  icon={<Download />}
                  label={loading ? 'Generating...' : 'Generate & Download Report'}
                  primary
                  onClick={handleGenerateReport}
                  disabled={loading || !filters.reportType}
                />
              </Box>
            </Form>
          </CardBody>
        </Card>

        {/* Report Preview */}
        <Box gap="medium">
          <Card>
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Report Preview</Heading>
            </CardHeader>
            <CardBody pad="medium" gap="small">
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Type:</Text>
                <Text size="small">
                  {reportTypes.find(rt => rt.value === filters.reportType)?.label || 'Not selected'}
                </Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Datacenter:</Text>
                <Text size="small">{filters.datacenter || 'All'}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Date Range:</Text>
                <Text size="small">
                  {filters.dateFrom && filters.dateTo
                    ? `${filters.dateFrom} to ${filters.dateTo}`
                    : 'All dates'}
                </Text>
              </Box>
              {filters.reportType === 'issues' && (
                <>
                  <Box direction="row" justify="between">
                    <Text size="small" weight="bold">Severity:</Text>
                    <Text size="small">{filters.severity || 'All'}</Text>
                  </Box>
                  <Box direction="row" justify="between">
                    <Text size="small" weight="bold">Status:</Text>
                    <Text size="small">{filters.status || 'All'}</Text>
                  </Box>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Report Formats</Heading>
            </CardHeader>
            <CardBody pad="medium" gap="small">
              <Text size="small">
                <strong>CSV Format:</strong> Comma-separated values file compatible with Excel, Google Sheets, and other spreadsheet applications.
              </Text>
              <Text size="small" color="text-weak">
                Reports include all relevant fields based on the selected report type and filters.
              </Text>
            </CardBody>
          </Card>

          <Card>
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Report Contents</Heading>
            </CardHeader>
            <CardBody pad="medium" gap="small">
              {filters.reportType === 'audits' && (
                <Text size="small">
                  Audit ID, Datacenter, Data Hall, Technician, Status, Issues Count, Date Created, Date Completed
                </Text>
              )}
              {filters.reportType === 'issues' && (
                <Text size="small">
                  Issue ID, Audit ID, Device Type, Device ID, Rack Location, Description, Severity, Status, Date Created
                </Text>
              )}
              {filters.reportType === 'incidents' && (
                <Text size="small">
                  Incident ID, Location, Device, Description, Severity, Status, Date Created, Date Resolved
                </Text>
              )}
              {!filters.reportType && (
                <Text size="small" color="text-weak">
                  Select a report type to see contents
                </Text>
              )}
            </CardBody>
          </Card>
        </Box>
      </Grid>
    </Box>
  );
}

export default ReportsPage; 