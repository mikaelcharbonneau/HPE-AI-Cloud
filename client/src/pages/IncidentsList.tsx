import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  DataTable,
  Button,
  TextInput,
  Select,
  Spinner,
  Tag,
  Notification,
} from 'grommet';
import { Search, Filter, StatusGood } from 'grommet-icons';
import { useApi } from '../contexts/ApiContext';

interface Incident {
  id: string;
  audit_id: string;
  device_type: string;
  device_id: string;
  rack_location: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  datacenter: string;
  data_hall: string;
}

interface Filters {
  search: string;
  severity: string;
  status: string;
}

function IncidentsList() {
  const api = useApi();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    severity: '',
    status: '',
  });

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/incidents');
      setIncidents(response.data.incidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await api.put(`/api/incidents/${incidentId}/resolve`);
      fetchIncidents(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve incident');
    }
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters({ ...filters, [field]: value });
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'status-ok';
      case 'open':
        return 'status-critical';
      default:
        return 'status-unknown';
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = !filters.search || 
      incident.device_type.toLowerCase().includes(filters.search.toLowerCase()) ||
      incident.device_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
      incident.rack_location.toLowerCase().includes(filters.search.toLowerCase()) ||
      incident.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      incident.datacenter.toLowerCase().includes(filters.search.toLowerCase());

    const matchesSeverity = !filters.severity || incident.severity === filters.severity;
    const matchesStatus = !filters.status || incident.status === filters.status;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  if (loading) {
    return (
      <Box fill align="center" justify="center">
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <Box fill gap="medium">
      {/* Header */}
      <Box direction="row" justify="between" align="center">
        <Box>
          <Heading level="2" margin="none">
            Incidents
          </Heading>
          <Text color="text-weak">
            Critical issues requiring immediate attention
          </Text>
        </Box>
      </Box>

      {error && (
        <Notification
          status="critical"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader pad="medium" background="light-2">
          <Box direction="row" align="center" gap="small">
            <Filter size="small" />
            <Text weight="bold">Filters</Text>
          </Box>
        </CardHeader>
        <CardBody pad="medium">
          <Box direction="row" gap="medium" wrap>
            <Box width="medium">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Search</Text>
              <TextInput
                icon={<Search />}
                placeholder="Search incidents..."
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
              />
            </Box>
            <Box width="small">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Severity</Text>
              <Select
                placeholder="All Severities"
                value={filters.severity}
                onChange={({ value }) => handleFilterChange('severity', value)}
                options={['critical', 'warning', 'healthy']}
                clear
              />
            </Box>
            <Box width="small">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Status</Text>
              <Select
                placeholder="All Status"
                value={filters.status}
                onChange={({ value }) => handleFilterChange('status', value)}
                options={['open', 'resolved']}
                clear
              />
            </Box>
          </Box>
        </CardBody>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardBody pad="none">
          {error ? (
            <Box pad="medium" align="center">
              <Text color="status-critical">Error: {error}</Text>
              <Button margin="small" onClick={fetchIncidents} label="Retry" />
            </Box>
          ) : filteredIncidents.length > 0 ? (
            <DataTable
              columns={[
                {
                  property: 'datacenter',
                  header: 'Location',
                  primary: true,
                  render: (datum: Incident) => (
                    <Box>
                      <Text size="small" weight="bold">{datum.datacenter}</Text>
                      <Text size="xsmall" color="text-weak">{datum.data_hall}</Text>
                    </Box>
                  ),
                },
                {
                  property: 'device_type',
                  header: 'Device',
                  render: (datum: Incident) => (
                    <Box>
                      <Text size="small">{datum.device_type}</Text>
                      {datum.device_id && (
                        <Text size="xsmall" color="text-weak">{datum.device_id}</Text>
                      )}
                    </Box>
                  ),
                },
                {
                  property: 'rack_location',
                  header: 'Rack',
                  render: (datum: Incident) => (
                    <Text size="small">{datum.rack_location}</Text>
                  ),
                },
                {
                  property: 'description',
                  header: 'Description',
                  render: (datum: Incident) => (
                    <Text size="small" truncate style={{ maxWidth: '200px' }}>
                      {datum.description}
                    </Text>
                  ),
                },
                {
                  property: 'severity',
                  header: 'Severity',
                  render: (datum: Incident) => (
                    <Tag
                      value={datum.severity}
                      background={getSeverityColor(datum.severity)}
                    />
                  ),
                },
                {
                  property: 'status',
                  header: 'Status',
                  render: (datum: Incident) => (
                    <Tag
                      value={datum.status}
                      background={getStatusColor(datum.status)}
                    />
                  ),
                },
                {
                  property: 'created_at',
                  header: 'Date',
                  render: (datum: Incident) => (
                    <Text size="small">{formatDate(datum.created_at)}</Text>
                  ),
                },
                {
                  property: 'actions',
                  header: 'Actions',
                  render: (datum: Incident) => (
                    <Box direction="row" gap="xsmall">
                      {datum.status === 'open' && (
                        <Button
                          icon={<StatusGood />}
                          tip="Resolve Incident"
                          size="small"
                          onClick={() => handleResolveIncident(datum.id)}
                        />
                      )}
                    </Box>
                  ),
                },
              ]}
              data={filteredIncidents}
              border={{ body: 'horizontal' }}
            />
          ) : (
            <Box pad="large" align="center">
              <Text>No incidents found</Text>
              <Text size="small" color="text-weak" margin="small">
                {filters.search || filters.severity || filters.status
                  ? 'Try adjusting your filters'
                  : 'All critical issues have been resolved'}
              </Text>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Summary Stats */}
      <Box direction="row" gap="medium">
        <Card>
          <CardBody pad="medium" align="center">
            <Text size="large" weight="bold" color="status-critical">
              {incidents.filter(i => i.status === 'open').length}
            </Text>
            <Text size="small">Open Incidents</Text>
          </CardBody>
        </Card>
        <Card>
          <CardBody pad="medium" align="center">
            <Text size="large" weight="bold" color="status-ok">
              {incidents.filter(i => i.status === 'resolved').length}
            </Text>
            <Text size="small">Resolved Incidents</Text>
          </CardBody>
        </Card>
        <Card>
          <CardBody pad="medium" align="center">
            <Text size="large" weight="bold">
              {incidents.filter(i => i.severity === 'critical').length}
            </Text>
            <Text size="small">Critical Severity</Text>
          </CardBody>
        </Card>
      </Box>
    </Box>
  );
}

export default IncidentsList; 