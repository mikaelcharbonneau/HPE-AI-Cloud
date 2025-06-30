import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  DataTable,
  Button,
  Tag,
  Spinner,
  Grid,
  Form,
  FormField,
  Select,
  TextInput,
  TextArea,
  Notification,
} from 'grommet';
import {
  Add,
  StatusGood,
  Previous,
  Save,
} from 'grommet-icons';
import { useApi } from '../contexts/ApiContext';

interface Issue {
  id: string;
  device_type: string;
  device_id: string;
  rack_location: string;
  u_height: number;
  device_details: any;
  description: string;
  severity: string;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

interface Audit {
  id: string;
  datacenter: string;
  data_hall: string;
  walkthrough_id: string;
  status: string;
  technician_id: number;
  created_at: string;
  completed_at: string | null;
  first_name: string;
  last_name: string;
  issues: Issue[];
}

interface NewIssueForm {
  device_type: string;
  device_id: string;
  rack_location: string;
  u_height: string;
  description: string;
  severity: string;
}

function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [newIssue, setNewIssue] = useState<NewIssueForm>({
    device_type: '',
    device_id: '',
    rack_location: '',
    u_height: '',
    description: '',
    severity: 'warning',
  });
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/audits/${id}`);
      setAudit(response.data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit');
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (id) {
      fetchAudit();
    }
  }, [id, fetchAudit]);

  const handleAddIssue = async () => {
    try {
      setSubmittingIssue(true);
      await api.post(`/api/audits/${id}/issues`, {
        ...newIssue,
        u_height: parseInt(newIssue.u_height) || null,
      });
      setNewIssue({
        device_type: '',
        device_id: '',
        rack_location: '',
        u_height: '',
        description: '',
        severity: 'warning',
      });
      setShowAddIssue(false);
      fetchAudit(); // Refresh audit data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add issue');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleCompleteAudit = async () => {
    try {
      await api.put(`/api/audits/${id}`, { status: 'completed' });
      fetchAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete audit');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'status-critical';
      case 'warning':
        return 'status-warning';
      case 'healthy':
        return 'status-ok';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <Box fill align="center" justify="center">
        <Spinner size="large" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box fill align="center" justify="center">
        <Text color="status-critical">Error: {error}</Text>
        <Button margin="small" onClick={fetchAudit} label="Retry" />
      </Box>
    );
  }

  if (!audit) {
    return (
      <Box fill align="center" justify="center">
        <Text>Audit not found</Text>
        <Button margin="small" onClick={() => navigate('/audits')} label="Back to Audits" />
      </Box>
    );
  }

  return (
    <Box fill gap="medium">
      {/* Header */}
      <Box direction="row" justify="between" align="center">
        <Box>
          <Box direction="row" align="center" gap="small">
            <Button
              icon={<Previous />}
              onClick={() => navigate('/audits')}
              plain
            />
            <Heading level="2" margin="none">
              Audit Details
            </Heading>
          </Box>
          <Text color="text-weak">
            {audit.datacenter} - {audit.data_hall}
          </Text>
        </Box>
        <Box direction="row" gap="small">
          {audit.status === 'active' && (
            <>
              <Button
                icon={<Add />}
                label="Add Issue"
                onClick={() => setShowAddIssue(true)}
              />
              <Button
                icon={<StatusGood />}
                label="Complete Audit"
                primary
                onClick={handleCompleteAudit}
              />
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Notification
          status="critical"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Audit Info */}
      <Grid columns={['2/3', '1/3']} gap="medium">
        <Box gap="medium">
          {/* Issues Table */}
          <Card>
            <CardHeader pad="medium" background="light-2">
              <Box direction="row" justify="between" align="center">
                <Heading level="4" margin="none">
                  Issues Reported ({audit.issues?.length || 0})
                </Heading>
                {audit.status === 'active' && (
                  <Button
                    icon={<Add />}
                    label="Add Issue"
                    size="small"
                    onClick={() => setShowAddIssue(true)}
                  />
                )}
              </Box>
            </CardHeader>
            <CardBody pad="none">
              {audit.issues && audit.issues.length > 0 ? (
                <DataTable
                  columns={[
                    {
                      property: 'device_type',
                      header: 'Device Type',
                      primary: true,
                    },
                    {
                      property: 'device_id',
                      header: 'Device ID',
                    },
                    {
                      property: 'rack_location',
                      header: 'Rack Location',
                    },
                    {
                      property: 'severity',
                      header: 'Severity',
                      render: (datum: Issue) => (
                        <Tag
                          value={datum.severity}
                          background={getSeverityColor(datum.severity)}
                        />
                      ),
                    },
                    {
                      property: 'description',
                      header: 'Description',
                      render: (datum: Issue) => (
                        <Text size="small" truncate>
                          {datum.description}
                        </Text>
                      ),
                    },
                    {
                      property: 'created_at',
                      header: 'Date',
                      render: (datum: Issue) => (
                        <Text size="small">{formatDate(datum.created_at)}</Text>
                      ),
                    },
                  ]}
                  data={audit.issues}
                  border={{ body: 'horizontal' }}
                />
              ) : (
                <Box pad="large" align="center">
                  <Text>No issues reported yet</Text>
                  {audit.status === 'active' && (
                    <Button
                      margin="small"
                      label="Add First Issue"
                      onClick={() => setShowAddIssue(true)}
                    />
                  )}
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Add Issue Form */}
          {showAddIssue && (
            <Card>
              <CardHeader pad="medium" background="light-2">
                <Heading level="4" margin="none">Add New Issue</Heading>
              </CardHeader>
              <CardBody pad="medium">
                <Form>
                  <Grid columns={['1/2', '1/2']} gap="medium">
                    <FormField label="Device Type" required>
                      <Select
                        placeholder="Select device type"
                        value={newIssue.device_type}
                        onChange={({ value }) =>
                          setNewIssue({ ...newIssue, device_type: value })
                        }
                        options={['PSU', 'PDU', 'Heat Exchanger', 'Other']}
                      />
                    </FormField>
                    <FormField label="Device ID">
                      <TextInput
                        value={newIssue.device_id}
                        onChange={(event) =>
                          setNewIssue({ ...newIssue, device_id: event.target.value })
                        }
                        placeholder="e.g., PSU-001"
                      />
                    </FormField>
                  </Grid>

                  <Grid columns={['1/2', '1/2']} gap="medium">
                    <FormField label="Rack Location" required>
                      <TextInput
                        value={newIssue.rack_location}
                        onChange={(event) =>
                          setNewIssue({ ...newIssue, rack_location: event.target.value })
                        }
                        placeholder="e.g., A01"
                      />
                    </FormField>
                    <FormField label="U-Height">
                      <TextInput
                        type="number"
                        value={newIssue.u_height}
                        onChange={(event) =>
                          setNewIssue({ ...newIssue, u_height: event.target.value })
                        }
                        placeholder="e.g., 42"
                      />
                    </FormField>
                  </Grid>

                  <FormField label="Severity" required>
                    <Select
                      value={newIssue.severity}
                      onChange={({ value }) =>
                        setNewIssue({ ...newIssue, severity: value })
                      }
                      options={['critical', 'warning', 'healthy']}
                    />
                  </FormField>

                  <FormField label="Description" required>
                    <TextArea
                      value={newIssue.description}
                      onChange={(event) =>
                        setNewIssue({ ...newIssue, description: event.target.value })
                      }
                      placeholder="Describe the issue..."
                      rows={3}
                    />
                  </FormField>

                  <Box direction="row" gap="small" margin={{ top: 'medium' }}>
                    <Button
                      icon={<Save />}
                      label={submittingIssue ? 'Adding...' : 'Add Issue'}
                      primary
                      onClick={handleAddIssue}
                      disabled={
                        submittingIssue ||
                        !newIssue.device_type ||
                        !newIssue.rack_location ||
                        !newIssue.description
                      }
                    />
                    <Button
                      label="Cancel"
                      onClick={() => setShowAddIssue(false)}
                    />
                  </Box>
                </Form>
              </CardBody>
            </Card>
          )}
        </Box>

        {/* Audit Summary */}
        <Box gap="medium">
          <Card>
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Audit Summary</Heading>
            </CardHeader>
            <CardBody pad="medium" gap="small">
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Status:</Text>
                <Tag
                  value={audit.status}
                  background={audit.status === 'completed' ? 'status-ok' : 'status-warning'}
                />
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Datacenter:</Text>
                <Text size="small">{audit.datacenter}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Data Hall:</Text>
                <Text size="small">{audit.data_hall}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Walkthrough ID:</Text>
                <Text size="small">{audit.walkthrough_id || 'N/A'}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Technician:</Text>
                <Text size="small">{audit.first_name} {audit.last_name}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small" weight="bold">Started:</Text>
                <Text size="small">{formatDate(audit.created_at)}</Text>
              </Box>
              {audit.completed_at && (
                <Box direction="row" justify="between">
                  <Text size="small" weight="bold">Completed:</Text>
                  <Text size="small">{formatDate(audit.completed_at)}</Text>
                </Box>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Issue Statistics</Heading>
            </CardHeader>
            <CardBody pad="medium" gap="small">
              <Box direction="row" justify="between">
                <Text size="small">Total Issues:</Text>
                <Text size="small" weight="bold">{audit.issues?.length || 0}</Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small">Critical:</Text>
                <Text size="small" color="status-critical" weight="bold">
                  {audit.issues?.filter(i => i.severity === 'critical').length || 0}
                </Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small">Warning:</Text>
                <Text size="small" color="status-warning" weight="bold">
                  {audit.issues?.filter(i => i.severity === 'warning').length || 0}
                </Text>
              </Box>
              <Box direction="row" justify="between">
                <Text size="small">Healthy:</Text>
                <Text size="small" color="status-ok" weight="bold">
                  {audit.issues?.filter(i => i.severity === 'healthy').length || 0}
                </Text>
              </Box>
            </CardBody>
          </Card>
        </Box>
      </Grid>
    </Box>
  );
}

export default AuditDetail; 